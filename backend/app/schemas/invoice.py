from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InvoiceStatus(StrEnum):
    REVIEW_PENDING = "review_pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


class PdfType(StrEnum):
    DIGITAL = "digital"
    SCANNED = "scanned"


class ExtractionMethod(StrEnum):
    TEXT = "text"
    VISION = "vision"


class InvoiceBase(BaseModel):
    invoice_number: str | None = None
    vendor_name: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    total_amount: Decimal | None = None
    tax_amount: Decimal | None = None
    currency: str | None = None
    detected_locale: str | None = None


class InvoiceUpdate(BaseModel):
    invoice_number: str | None = None
    vendor_name: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    total_amount: Decimal | None = None
    tax_amount: Decimal | None = None
    currency: str | None = None
    detected_locale: str | None = None
    status: InvoiceStatus | None = None
    rejection_reason: str | None = None
    field_warnings: dict[str, str] | None = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    uploaded_by: UUID | None
    status: str
    original_filename: str
    file_hash: str
    pdf_type: str | None
    page_count: int | None
    invoice_number: str | None
    vendor_name: str | None
    invoice_date: date | None
    due_date: date | None
    total_amount: Decimal | None
    tax_amount: Decimal | None
    currency: str | None
    detected_locale: str | None
    field_confidence: dict[str, float]
    field_warnings: dict[str, str]
    overall_confidence: float | None
    validation_errors: list[Any] | None
    extraction_model: str | None
    extraction_method: str | None
    extraction_attempts: int
    extraction_tokens_in: int | None
    extraction_tokens_out: int | None
    extraction_cost_usd: Decimal | None
    extraction_duration_ms: int | None
    extraction_notes: str | None
    ai_extracted_fields: dict[str, Any] | None
    extracted_at: datetime | None
    reviewed_at: datetime | None
    reviewed_by: UUID | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime


class DuplicateSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    created_at: datetime
    status: str
    vendor_name: str | None = None
    invoice_number: str | None = None


class UploadResponse(BaseModel):
    invoice: InvoiceResponse
    duplicates: list[DuplicateSummary]
    extraction_method: str
    cost_usd: float


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ReExtractResponse(BaseModel):
    ai_fields: dict[str, Any]
    current_fields: dict[str, Any]
    diff: dict[str, dict[str, Any]]


class ApplyDiffRequest(BaseModel):
    fields_to_apply: dict[str, str] = Field(
        description="Map of field name to 'ai' or 'current'"
    )


class StatsResponse(BaseModel):
    total_invoices: int
    pending_review: int
    approved: int
    rejected: int
    failed: int
    total_approved_amount: Decimal
    average_confidence: float | None
    extraction_cost_this_month: Decimal
    extraction_cost_last_month: Decimal
    recent_invoices: list[InvoiceResponse]
