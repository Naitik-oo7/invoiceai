"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(50), server_default="review_pending", nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column("pdf_type", sa.String(20), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("invoice_number", sa.String(255), nullable=True),
        sa.Column("vendor_name", sa.String(500), nullable=True),
        sa.Column("invoice_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("total_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("tax_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("currency", sa.String(10), nullable=True),
        sa.Column("detected_locale", sa.String(20), nullable=True),
        sa.Column("field_confidence", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("field_warnings", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("overall_confidence", sa.Float(), nullable=True),
        sa.Column("validation_errors", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=True),
        sa.Column("extraction_model", sa.String(50), nullable=True),
        sa.Column("extraction_method", sa.String(20), nullable=True),
        sa.Column("extraction_attempts", sa.Integer(), server_default="1", nullable=False),
        sa.Column("extraction_tokens_in", sa.Integer(), nullable=True),
        sa.Column("extraction_tokens_out", sa.Integer(), nullable=True),
        sa.Column("extraction_cost_usd", sa.Numeric(8, 4), nullable=True),
        sa.Column("extraction_duration_ms", sa.Integer(), nullable=True),
        sa.Column("extraction_notes", sa.Text(), nullable=True),
        sa.Column("ai_extracted_fields", postgresql.JSONB(), nullable=True),
        sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("idx_invoices_status", "invoices", ["status"])
    op.create_index("idx_invoices_vendor", "invoices", ["vendor_name"])
    op.create_index("idx_invoices_invoice_date", "invoices", ["invoice_date"])
    op.create_index("idx_invoices_due_date", "invoices", ["due_date"])
    op.create_index("idx_invoices_created", "invoices", ["created_at"])
    op.create_index("idx_invoices_file_hash", "invoices", ["file_hash"])
    op.create_index(
        "idx_invoices_dup_check",
        "invoices",
        ["vendor_name", "invoice_number"],
        unique=True,
        postgresql_where=sa.text(
            "status = 'approved' AND vendor_name IS NOT NULL AND invoice_number IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index("idx_invoices_dup_check", table_name="invoices")
    op.drop_index("idx_invoices_file_hash", table_name="invoices")
    op.drop_index("idx_invoices_created", table_name="invoices")
    op.drop_index("idx_invoices_due_date", table_name="invoices")
    op.drop_index("idx_invoices_invoice_date", table_name="invoices")
    op.drop_index("idx_invoices_vendor", table_name="invoices")
    op.drop_index("idx_invoices_status", table_name="invoices")
    op.drop_table("invoices")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
