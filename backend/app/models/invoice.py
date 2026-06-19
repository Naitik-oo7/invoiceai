import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Uuid,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InvoiceStatus(str, enum.Enum):
    REVIEW_PENDING = "review_pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


class PdfType(str, enum.Enum):
    DIGITAL = "digital"
    SCANNED = "scanned"


class ExtractionMethod(str, enum.Enum):
    TEXT = "text"
    VISION = "vision"


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        Index("idx_invoices_status", "status"),
        Index("idx_invoices_vendor", "vendor_name"),
        Index("idx_invoices_invoice_date", "invoice_date"),
        Index("idx_invoices_due_date", "due_date"),
        Index("idx_invoices_created", "created_at"),
        Index("idx_invoices_file_hash", "file_hash"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default=InvoiceStatus.REVIEW_PENDING.value
    )
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    pdf_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    invoice_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vendor_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    detected_locale: Mapped[str | None] = mapped_column(String(20), nullable=True)

    field_confidence: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    field_warnings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    overall_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    validation_errors: Mapped[list] = mapped_column(JSON, nullable=True, default=list)

    extraction_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    extraction_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    extraction_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    extraction_tokens_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extraction_tokens_out: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extraction_cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    extraction_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extraction_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    ai_extracted_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    extracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    uploader = relationship("User", foreign_keys=[uploaded_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
