import logging
from datetime import UTC, datetime
from decimal import Decimal
from math import ceil
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, require_rate_limit
from app.core.exceptions import AppException, ExtractionError, NotFoundError
from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.invoice import (
    ApplyDiffRequest,
    DuplicateSummary,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceUpdate,
    ReExtractResponse,
    UploadResponse,
)
from app.services.duplicates import check_for_duplicates
from app.services.extraction import extract_invoice_fields
from app.services.pdf import process_pdf

logger = logging.getLogger(__name__)

router = APIRouter()

EXTRACTABLE_FIELDS = [
    "invoice_number",
    "vendor_name",
    "invoice_date",
    "due_date",
    "total_amount",
    "tax_amount",
    "currency",
    "detected_locale",
]


def _invoice_to_fields_dict(invoice: Invoice) -> dict[str, Any]:
    return {
        "invoice_number": invoice.invoice_number,
        "vendor_name": invoice.vendor_name,
        "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "total_amount": float(invoice.total_amount) if invoice.total_amount is not None else None,
        "tax_amount": float(invoice.tax_amount) if invoice.tax_amount is not None else None,
        "currency": invoice.currency,
        "detected_locale": invoice.detected_locale,
    }


def _fields_from_extraction(fields) -> dict[str, Any]:
    return {
        "invoice_number": fields.invoice_number,
        "vendor_name": fields.vendor_name,
        "invoice_date": fields.invoice_date.isoformat() if fields.invoice_date else None,
        "due_date": fields.due_date.isoformat() if fields.due_date else None,
        "total_amount": float(fields.total_amount) if fields.total_amount is not None else None,
        "tax_amount": float(fields.tax_amount) if fields.tax_amount is not None else None,
        "currency": fields.currency,
        "detected_locale": fields.detected_locale,
    }


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_invoice(
    file: UploadFile = File(...),
    current_user: User = Depends(require_rate_limit),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise AppException(detail="Only PDF files are accepted", code="INVALID_FILE_TYPE")

    file_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise AppException(
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_MB}MB",
            code="FILE_TOO_LARGE",
        )

    if not file_bytes.startswith(b"%PDF"):
        raise AppException(detail="Invalid PDF file", code="INVALID_PDF")

    try:
        pdf_result = await process_pdf(file_bytes)
        extraction = await extract_invoice_fields(pdf_result, file.filename)
    except Exception as exc:
        logger.exception("Extraction failed for %s: %s", file.filename, exc)
        failed_invoice = Invoice(
            uploaded_by=current_user.id,
            status=InvoiceStatus.FAILED.value,
            original_filename=file.filename,
            file_hash=__import__("hashlib").sha256(file_bytes).hexdigest(),
            extraction_notes=str(exc)[:500],
            extracted_at=datetime.now(UTC),
        )
        db.add(failed_invoice)
        await db.flush()
        await db.refresh(failed_invoice)
        raise ExtractionError(detail=f"Extraction failed: {exc}") from exc

    duplicates = await check_for_duplicates(
        db,
        pdf_result.file_hash,
        extraction.fields.vendor_name,
        extraction.fields.invoice_number,
    )

    invoice = Invoice(
        uploaded_by=current_user.id,
        status=InvoiceStatus.REVIEW_PENDING.value,
        original_filename=file.filename,
        file_hash=pdf_result.file_hash,
        pdf_type=pdf_result.pdf_type,
        page_count=pdf_result.page_count,
        invoice_number=extraction.fields.invoice_number,
        vendor_name=extraction.fields.vendor_name,
        invoice_date=extraction.fields.invoice_date,
        due_date=extraction.fields.due_date,
        total_amount=extraction.fields.total_amount,
        tax_amount=extraction.fields.tax_amount,
        currency=extraction.fields.currency,
        detected_locale=extraction.fields.detected_locale,
        field_confidence=extraction.fields.confidence,
        field_warnings=extraction.warnings,
        overall_confidence=extraction.fields.overall_confidence,
        extraction_model="gpt-4o",
        extraction_method=extraction.method,
        extraction_attempts=extraction.attempts,
        extraction_tokens_in=extraction.tokens_in,
        extraction_tokens_out=extraction.tokens_out,
        extraction_cost_usd=Decimal(str(extraction.cost_usd)),
        extraction_duration_ms=extraction.duration_ms,
        extraction_notes=extraction.fields.extraction_notes,
        ai_extracted_fields=extraction.raw_data,
        extracted_at=datetime.now(UTC),
    )
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)

    return UploadResponse(
        invoice=InvoiceResponse.model_validate(invoice),
        duplicates=[DuplicateSummary.model_validate(d) for d in duplicates],
        extraction_method=extraction.method,
        cost_usd=extraction.cost_usd,
    )


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceListResponse:
    from datetime import date as date_type

    query = select(Invoice)
    count_query = select(func.count()).select_from(Invoice)

    filters = []
    if status:
        filters.append(Invoice.status == status)
    if search:
        pattern = f"%{search}%"
        filters.append(
            or_(Invoice.vendor_name.ilike(pattern), Invoice.invoice_number.ilike(pattern))
        )
    if date_from:
        filters.append(Invoice.invoice_date >= date_type.fromisoformat(date_from))
    if date_to:
        filters.append(Invoice.invoice_date <= date_type.fromisoformat(date_to))

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    sort_column = getattr(Invoice, sort_by, Invoice.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return InvoiceListResponse(
        items=[InvoiceResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    invoice = await _get_invoice_or_404(db, invoice_id)
    return InvoiceResponse.model_validate(invoice)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    payload: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    invoice = await _get_invoice_or_404(db, invoice_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "status" in update_data:
        new_status = update_data.pop("status")
        invoice.status = new_status.value if hasattr(new_status, "value") else new_status
        if invoice.status in (InvoiceStatus.APPROVED.value, InvoiceStatus.REJECTED.value):
            invoice.reviewed_at = datetime.now(UTC)
            invoice.reviewed_by = current_user.id

    for key, value in update_data.items():
        setattr(invoice, key, value)

    invoice.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(invoice)
    return InvoiceResponse.model_validate(invoice)


@router.post("/{invoice_id}/re-extract", response_model=ReExtractResponse)
async def re_extract_invoice(
    invoice_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_rate_limit),
    db: AsyncSession = Depends(get_db),
) -> ReExtractResponse:
    invoice = await _get_invoice_or_404(db, invoice_id)
    file_bytes = await file.read()

    pdf_result = await process_pdf(file_bytes)
    extraction = await extract_invoice_fields(pdf_result, file.filename or "reupload.pdf", str(invoice_id))

    ai_fields = _fields_from_extraction(extraction.fields)
    ai_fields["field_confidence"] = extraction.fields.confidence
    ai_fields["field_warnings"] = extraction.warnings

    invoice.ai_extracted_fields = {**extraction.raw_data, **ai_fields}
    await db.flush()

    current_fields = _invoice_to_fields_dict(invoice)

    diff: dict[str, dict[str, Any]] = {}
    for field in EXTRACTABLE_FIELDS:
        current_val = current_fields.get(field)
        ai_val = ai_fields.get(field)
        if current_val != ai_val:
            diff[field] = {"current": current_val, "ai": ai_val, "changed": True}
        else:
            diff[field] = {"current": current_val, "ai": ai_val, "changed": False}

    return ReExtractResponse(
        ai_fields={**ai_fields, "field_confidence": extraction.fields.confidence, "field_warnings": extraction.warnings},
        current_fields=current_fields,
        diff=diff,
    )


@router.post("/{invoice_id}/apply-diff", response_model=InvoiceResponse)
async def apply_diff(
    invoice_id: UUID,
    payload: ApplyDiffRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    invoice = await _get_invoice_or_404(db, invoice_id)

    if not invoice.ai_extracted_fields:
        raise AppException(detail="No AI extraction data available", code="NO_AI_DATA")

    current = _invoice_to_fields_dict(invoice)
    ai_snapshot = invoice.ai_extracted_fields

    for field, choice in payload.fields_to_apply.items():
        if field not in EXTRACTABLE_FIELDS:
            continue
        if choice == "ai":
            value = ai_snapshot.get(field)
            if field in ("invoice_date", "due_date") and value:
                from datetime import date as date_type
                setattr(invoice, field, date_type.fromisoformat(value) if isinstance(value, str) else value)
            elif field in ("total_amount", "tax_amount") and value is not None:
                setattr(invoice, field, Decimal(str(value)))
            else:
                setattr(invoice, field, value)
        elif choice == "current":
            value = current.get(field)
            if field in ("invoice_date", "due_date") and value:
                from datetime import date as date_type
                setattr(invoice, field, date_type.fromisoformat(value))
            elif field in ("total_amount", "tax_amount") and value is not None:
                setattr(invoice, field, Decimal(str(value)))
            else:
                setattr(invoice, field, value)

    invoice.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(invoice)
    return InvoiceResponse.model_validate(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    invoice = await _get_invoice_or_404(db, invoice_id)
    await db.delete(invoice)


async def _get_invoice_or_404(db: AsyncSession, invoice_id: UUID) -> Invoice:
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise NotFoundError(detail="Invoice not found", code="INVOICE_NOT_FOUND")
    return invoice
