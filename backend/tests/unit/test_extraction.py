from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.extraction import calculate_cost, extract_invoice_fields
from app.services.pdf import PDFProcessingResult


def test_calculate_cost():
    cost = calculate_cost("text", 1000, 500)
    assert cost == round((1000 / 1_000_000) * 2.50 + (500 / 1_000_000) * 10.00, 4)


@pytest.mark.asyncio
async def test_extract_from_text_success():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = """{
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
            "tax_amount": 0.80
        },
        "overall_confidence": 0.90,
        "extraction_notes": "Clear document."
    }"""
    mock_response.usage = MagicMock(prompt_tokens=500, completion_tokens=200)

    pdf_result = PDFProcessingResult(
        pdf_type="digital",
        page_count=1,
        text_content="Invoice text content here",
        page_images=None,
        file_hash="abc123",
    )

    with patch("app.services.extraction._get_client") as mock_client:
        mock_client.return_value.chat.completions.create = AsyncMock(return_value=mock_response)
        result = await extract_invoice_fields(pdf_result, "test.pdf")

    assert result.fields.invoice_number == "INV-001"
    assert result.method == "text"
    assert result.attempts == 1
    assert result.cost_usd > 0


@pytest.mark.asyncio
async def test_extract_retry_on_validation_failure():
    bad_response = MagicMock()
    bad_response.choices = [MagicMock()]
    bad_response.choices[0].message.content = '{"invoice_number": "X", "confidence": {"invoice_number": 2.0}}'
    bad_response.usage = MagicMock(prompt_tokens=100, completion_tokens=50)

    good_response = MagicMock()
    good_response.choices = [MagicMock()]
    good_response.choices[0].message.content = """{
        "invoice_number": "INV-002",
        "vendor_name": "Beta Inc",
        "invoice_date": "2025-03-01",
        "due_date": null,
        "total_amount": 500.0,
        "tax_amount": null,
        "currency": "EUR",
        "detected_locale": "de-DE",
        "confidence": {
            "invoice_number": 0.9,
            "vendor_name": 0.9,
            "invoice_date": 0.9,
            "due_date": 0.0,
            "total_amount": 0.9,
            "tax_amount": 0.0
        },
        "overall_confidence": 0.85,
        "extraction_notes": "Retried successfully."
    }"""
    good_response.usage = MagicMock(prompt_tokens=200, completion_tokens=100)

    pdf_result = PDFProcessingResult(
        pdf_type="digital",
        page_count=1,
        text_content="Invoice",
        page_images=None,
        file_hash="def456",
    )

    with patch("app.services.extraction._get_client") as mock_client:
        mock_client.return_value.chat.completions.create = AsyncMock(
            side_effect=[bad_response, good_response]
        )
        result = await extract_invoice_fields(pdf_result, "test.pdf")

    assert result.attempts == 2
    assert result.fields.invoice_number == "INV-002"
