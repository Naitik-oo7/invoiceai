import io
from unittest.mock import AsyncMock, MagicMock, patch

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
    c.drawString(100, 750, "INVOICE #INV-TEST Vendor: Test Corp Total: $500.00 " * 5)
    c.save()
    return buffer.getvalue()


def _mock_extraction() -> ExtractionResult:
    fields = ValidatedExtraction(
        invoice_number="INV-TEST",
        vendor_name="Test Corp",
        invoice_date=date(2025, 1, 15),
        due_date=date(2025, 2, 15),
        total_amount=Decimal("500.00"),
        tax_amount=Decimal("50.00"),
        currency="USD",
        detected_locale="en-US",
        confidence={
            "invoice_number": 0.95,
            "vendor_name": 0.90,
            "invoice_date": 0.95,
            "due_date": 0.85,
            "total_amount": 0.98,
            "tax_amount": 0.80,
        },
        overall_confidence=0.90,
        extraction_notes="Test extraction.",
    )
    return ExtractionResult(
        fields=fields,
        warnings={},
        method="text",
        attempts=1,
        tokens_in=500,
        tokens_out=200,
        cost_usd=0.0033,
        duration_ms=1500,
        raw_data={"invoice_number": "INV-TEST"},
    )


@pytest.mark.asyncio
async def test_upload_invoice(client: AsyncClient, auth_headers):
    pdf_bytes = _make_pdf()
    with patch("app.api.invoices.extract_invoice_fields", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = _mock_extraction()
        response = await client.post(
            "/api/invoices/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
    assert response.status_code == 201
    data = response.json()
    assert data["invoice"]["invoice_number"] == "INV-TEST"
    assert data["extraction_method"] == "text"


@pytest.mark.asyncio
async def test_list_invoices(client: AsyncClient, auth_headers):
    pdf_bytes = _make_pdf()
    with patch("app.api.invoices.extract_invoice_fields", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = _mock_extraction()
        await client.post(
            "/api/invoices/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )

    response = await client.get("/api/invoices", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_invoice(client: AsyncClient, auth_headers):
    pdf_bytes = _make_pdf()
    with patch("app.api.invoices.extract_invoice_fields", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = _mock_extraction()
        upload_resp = await client.post(
            "/api/invoices/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
    invoice_id = upload_resp.json()["invoice"]["id"]

    response = await client.get(f"/api/invoices/{invoice_id}", headers=auth_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_patch_invoice(client: AsyncClient, auth_headers):
    pdf_bytes = _make_pdf()
    with patch("app.api.invoices.extract_invoice_fields", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = _mock_extraction()
        upload_resp = await client.post(
            "/api/invoices/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
    invoice_id = upload_resp.json()["invoice"]["id"]

    response = await client.patch(
        f"/api/invoices/{invoice_id}",
        headers=auth_headers,
        json={"status": "approved", "vendor_name": "Updated Corp"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"


@pytest.mark.asyncio
async def test_delete_invoice(client: AsyncClient, auth_headers):
    pdf_bytes = _make_pdf()
    with patch("app.api.invoices.extract_invoice_fields", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = _mock_extraction()
        upload_resp = await client.post(
            "/api/invoices/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
    invoice_id = upload_resp.json()["invoice"]["id"]

    response = await client.delete(f"/api/invoices/{invoice_id}", headers=auth_headers)
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_upload_invalid_file(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/invoices/upload",
        headers=auth_headers,
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 400
