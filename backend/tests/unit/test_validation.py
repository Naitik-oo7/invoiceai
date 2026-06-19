from datetime import date, timedelta
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.validation import (
    ValidatedExtraction,
    generate_field_warnings,
    run_sanity_checks,
    validate_extraction_output,
)


def _valid_data() -> dict:
    return {
        "invoice_number": "INV-001",
        "vendor_name": "Acme Corp",
        "invoice_date": "2025-01-15",
        "due_date": "2025-02-15",
        "total_amount": 1234.56,
        "tax_amount": 100.0,
        "currency": "USD",
        "detected_locale": "en-US",
        "confidence": {
            "invoice_number": 0.95,
            "vendor_name": 0.90,
            "invoice_date": 0.95,
            "due_date": 0.85,
            "total_amount": 0.98,
            "tax_amount": 0.80,
        },
        "overall_confidence": 0.90,
        "extraction_notes": "All fields clear.",
    }


def test_validate_extraction_output():
    result = validate_extraction_output(_valid_data())
    assert result.invoice_number == "INV-001"
    assert result.currency == "USD"


def test_validate_negative_amount():
    data = _valid_data()
    data["total_amount"] = -100
    with pytest.raises(ValidationError):
        validate_extraction_output(data)


def test_validate_invalid_confidence():
    data = _valid_data()
    data["confidence"]["total_amount"] = 1.5
    with pytest.raises(ValidationError):
        validate_extraction_output(data)


def test_sanity_tax_greater_than_total():
    extraction = ValidatedExtraction(
        invoice_number="INV-1",
        total_amount=Decimal("100"),
        tax_amount=Decimal("200"),
        confidence={},
    )
    warnings = run_sanity_checks(extraction)
    assert "tax_amount" in warnings


def test_sanity_due_before_invoice():
    extraction = ValidatedExtraction(
        invoice_date=date(2025, 6, 1),
        due_date=date(2025, 5, 1),
        confidence={},
    )
    warnings = run_sanity_checks(extraction)
    assert "due_date" in warnings


def test_sanity_future_invoice_date():
    extraction = ValidatedExtraction(
        invoice_date=date.today() + timedelta(days=30),
        confidence={},
    )
    warnings = run_sanity_checks(extraction)
    assert "invoice_date" in warnings


def test_sanity_zero_total():
    extraction = ValidatedExtraction(total_amount=Decimal("0"), confidence={})
    warnings = run_sanity_checks(extraction)
    assert "total_amount" in warnings


def test_field_warnings_missing():
    extraction = ValidatedExtraction(
        invoice_number=None,
        confidence={"invoice_number": 0.1},
    )
    warnings = generate_field_warnings(extraction)
    assert "invoice_number" in warnings


def test_field_warnings_low_confidence():
    extraction = ValidatedExtraction(
        vendor_name="Acme",
        confidence={"vendor_name": 0.5},
    )
    warnings = generate_field_warnings(extraction)
    assert "vendor_name" in warnings
