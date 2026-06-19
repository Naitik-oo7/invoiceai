import hashlib
import io

import pytest
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.services.pdf import (
    PAGE_BREAK,
    _detect_pdf_type_sync,
    _extract_all_pages_text_sync,
    _select_pages_to_render,
    process_pdf,
)


def _make_digital_pdf(text: str) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, text)
    c.showPage()
    c.drawString(100, 750, "Page 2 content with more invoice data here.")
    c.save()
    return buffer.getvalue()


def _make_scanned_pdf() -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.save()
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_detect_digital_pdf():
    pdf_bytes = _make_digital_pdf(
        "INVOICE #INV-001 Vendor: Acme Corp Total: $1,234.56 Date: 2025-01-15 " * 3
    )
    result = _detect_pdf_type_sync(pdf_bytes)
    assert result == "digital"


@pytest.mark.asyncio
async def test_detect_scanned_pdf():
    pdf_bytes = _make_scanned_pdf()
    result = _detect_pdf_type_sync(pdf_bytes)
    assert result == "scanned"


@pytest.mark.asyncio
async def test_extract_all_pages_text():
    pdf_bytes = _make_digital_pdf("Page one text " * 20)
    text = _extract_all_pages_text_sync(pdf_bytes)
    assert PAGE_BREAK in text


@pytest.mark.asyncio
async def test_process_pdf_digital():
    pdf_bytes = _make_digital_pdf(
        "INVOICE #INV-001 Vendor: Acme Corp Total: $1,234.56 " * 5
    )
    result = await process_pdf(pdf_bytes)
    assert result.pdf_type == "digital"
    assert result.text_content is not None
    assert result.page_images is None
    assert len(result.file_hash) == 64


@pytest.mark.asyncio
async def test_hash_consistency():
    pdf_bytes = _make_digital_pdf("Same content " * 20)
    r1 = await process_pdf(pdf_bytes)
    r2 = await process_pdf(pdf_bytes)
    assert r1.file_hash == r2.file_hash


def test_select_pages_single():
    assert _select_pages_to_render(1) == [0]


def test_select_pages_multi():
    assert _select_pages_to_render(5) == [0, 1, 4]


def test_select_pages_two():
    assert _select_pages_to_render(2) == [0, 1]
