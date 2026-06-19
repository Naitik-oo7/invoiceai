import io
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.services.extraction import ExtractionResult
from app.services.validation import ValidatedExtraction
from decimal import Decimal
from datetime import date


def _make_pdf() -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, "INVOICE #EXP-001 Vendor: Export Co Total: $100.00 " * 5)
    c.save()
    return buffer.getvalue()


def _mock_extraction() -> ExtractionResult:
    fields = ValidatedExtraction(
        invoice_number="EXP-001",
        vendor_name="Export Co",
        invoice_date=date(2025, 1, 1),
        total_amount=Decimal("100.00"),
        currency="USD",
        confidence={"invoice_number": 0.9, "vendor_name": 0.9, "invoice_date": 0.9,
                    "due_date": 0.0, "total_amount": 0.9, "tax_amount": 0.0},
        overall_confidence=0.85,
    )
    return ExtractionResult(
        fields=fields, warnings={}, method="text", attempts=1,
        tokens_in=100, tokens_out=50, cost_usd=0.001, duration_ms=500,
        raw_data={},
    )


@pytest.mark.asyncio
async def test_export_csv(client: AsyncClient, auth_headers):
    pdf_bytes = _make_pdf()
    with patch("app.api.invoices.extract_invoice_fields", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = _mock_extraction()
        await client.post(
            "/api/invoices/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )

    response = await client.get("/api/invoices/export/csv", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert b"Invoice Number" in response.content
    assert b"EXP-001" in response.content


@pytest.mark.asyncio
async def test_export_excel(client: AsyncClient, auth_headers):
    pdf_bytes = _make_pdf()
    with patch("app.api.invoices.extract_invoice_fields", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = _mock_extraction()
        await client.post(
            "/api/invoices/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )

    response = await client.get("/api/invoices/export/excel", headers=auth_headers)
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert len(response.content) > 100
