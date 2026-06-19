import io
import json
from pathlib import Path

import pytest
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.services.extraction import extract_invoice_fields
from app.services.pdf import process_pdf

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "digital"


def _make_invoice_pdf(
    invoice_number: str,
    vendor: str,
    invoice_date: str,
    due_date: str,
    total: str,
    tax: str,
    currency: str = "USD",
) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, vendor)
    c.setFont("Helvetica", 12)
    c.drawString(100, 720, f"Invoice Number: {invoice_number}")
    c.drawString(100, 700, f"Invoice Date: {invoice_date}")
    c.drawString(100, 680, f"Due Date: {due_date}")
    c.drawString(100, 660, f"Subtotal: {total}")
    c.drawString(100, 640, f"Tax: {tax}")
    c.drawString(100, 620, f"Total Due: {total}")
    c.drawString(100, 600, f"Currency: {currency}")
    c.drawString(100, 560, "Bill To: Customer Inc.")
    c.drawString(100, 540, "123 Customer Street")
    c.save()
    return buffer.getvalue()


def _ensure_fixtures():
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    pdf_path = FIXTURES_DIR / "acme_invoice_001.pdf"
    expected_path = FIXTURES_DIR / "acme_invoice_001.expected.json"

    if not pdf_path.exists():
        pdf_bytes = _make_invoice_pdf(
            "INV-ACME-001",
            "Acme Corporation",
            "01/15/2025",
            "02/15/2025",
            "$1,234.56",
            "$100.00",
        )
        pdf_path.write_bytes(pdf_bytes)

    if not expected_path.exists():
        expected = {
            "invoice_number": "INV-ACME-001",
            "vendor_name": "Acme Corporation",
            "invoice_date": "2025-01-15",
            "due_date": "2025-02-15",
            "total_amount": 1234.56,
            "tax_amount": 100.0,
            "currency": "USD",
            "min_confidence": {
                "invoice_number": 0.7,
                "vendor_name": 0.7,
                "invoice_date": 0.7,
                "due_date": 0.5,
                "total_amount": 0.7,
                "tax_amount": 0.5,
            },
        }
        expected_path.write_text(json.dumps(expected, indent=2))


_ensure_fixtures()


@pytest.mark.accuracy
@pytest.mark.asyncio
async def test_acme_invoice_001():
    """Accuracy test against the configured LLM provider — run locally only."""
    import os

    provider = os.getenv("LLM_PROVIDER", "openai")
    if provider == "gemini":
        if not os.getenv("GEMINI_API_KEY"):
            pytest.skip("GEMINI_API_KEY not configured for accuracy tests")
    elif not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY", "").startswith("sk-test"):
        pytest.skip("OPENAI_API_KEY not configured for accuracy tests")

    pdf_path = FIXTURES_DIR / "acme_invoice_001.pdf"
    expected_path = FIXTURES_DIR / "acme_invoice_001.expected.json"
    expected = json.loads(expected_path.read_text())

    pdf_bytes = pdf_path.read_bytes()
    pdf_result = await process_pdf(pdf_bytes)
    result = await extract_invoice_fields(pdf_result, pdf_path.name)

    for field in ["invoice_number", "vendor_name", "invoice_date", "due_date", "total_amount", "tax_amount", "currency"]:
        exp_val = expected.get(field)
        if exp_val is not None:
            actual = getattr(result.fields, field)
            if field in ("total_amount", "tax_amount"):
                assert float(actual) == pytest.approx(float(exp_val), rel=0.01), f"{field} mismatch"
            elif field in ("invoice_date", "due_date"):
                assert actual.isoformat() == exp_val, f"{field} mismatch"
            else:
                assert actual == exp_val, f"{field} mismatch: {actual} != {exp_val}"

        min_conf = expected.get("min_confidence", {}).get(field)
        if min_conf is not None:
            conf = result.fields.confidence.get(field, 0)
            assert conf >= min_conf, f"{field} confidence {conf} < {min_conf}"
