from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator


class ValidatedExtraction(BaseModel):
    invoice_number: str | None = None
    vendor_name: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    total_amount: Decimal | None = None
    tax_amount: Decimal | None = None
    currency: str | None = None
    detected_locale: str | None = None
    confidence: dict[str, float] = Field(default_factory=dict)
    overall_confidence: float = 0.0
    extraction_notes: str | None = None

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: dict[str, float]) -> dict[str, float]:
        for key, val in v.items():
            if not 0.0 <= val <= 1.0:
                raise ValueError(f"Confidence for {key} must be between 0 and 1")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str | None) -> str | None:
        if v is not None and len(v) != 3:
            raise ValueError("Currency must be a 3-letter ISO code")
        return v.upper() if v else v

    @field_validator("total_amount", "tax_amount")
    @classmethod
    def validate_amounts(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < 0:
            raise ValueError("Amounts must be non-negative")
        return v


def validate_extraction_output(data: dict[str, Any]) -> ValidatedExtraction:
    return ValidatedExtraction.model_validate(data)


def run_sanity_checks(extraction: ValidatedExtraction) -> dict[str, str]:
    warnings: dict[str, str] = {}

    if extraction.tax_amount is not None and extraction.total_amount is not None:
        if extraction.tax_amount > extraction.total_amount:
            warnings["tax_amount"] = (
                f"Tax amount ({extraction.tax_amount}) is larger than total "
                f"({extraction.total_amount}) — likely an extraction error"
            )

    if extraction.invoice_date and extraction.due_date:
        if extraction.due_date < extraction.invoice_date:
            warnings["due_date"] = "Due date is before invoice date — please verify"

    if extraction.invoice_date:
        if extraction.invoice_date > date.today() + timedelta(days=7):
            warnings["invoice_date"] = "Invoice date is in the future — please verify"
        if extraction.invoice_date < date.today() - timedelta(days=365 * 5):
            warnings["invoice_date"] = "Invoice date is more than 5 years old — please verify"

    if extraction.total_amount is not None:
        if extraction.total_amount == 0:
            warnings["total_amount"] = "Total amount is zero — please verify"
        if extraction.total_amount > Decimal("10000000"):
            warnings["total_amount"] = "Total amount is unusually large — please verify"

    return warnings


def generate_field_warnings(extraction: ValidatedExtraction) -> dict[str, str]:
    warnings: dict[str, str] = {}
    field_labels = {
        "invoice_number": "Invoice number",
        "vendor_name": "Vendor name",
        "invoice_date": "Invoice date",
        "due_date": "Due date",
        "total_amount": "Total amount",
        "tax_amount": "Tax amount",
    }
    for field, label in field_labels.items():
        value = getattr(extraction, field)
        conf = extraction.confidence.get(field, 0)
        if value is None:
            warnings[field] = f"{label} was not found in the document — please enter manually"
        elif conf < 0.75:
            warnings[field] = f"Low confidence ({int(conf * 100)}%) — please verify"
    return warnings
