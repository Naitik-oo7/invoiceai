import asyncio
import base64
import hashlib
import io
import logging
import re
from dataclasses import dataclass
from typing import Literal

import pdfplumber
from pdf2image import convert_from_bytes
from PIL import Image

logger = logging.getLogger(__name__)

PAGE_BREAK = "\n--- PAGE BREAK ---\n"
MAX_IMAGE_DIMENSION = 2048
JPEG_QUALITY = 85
RENDER_DPI = 200


@dataclass
class PDFProcessingResult:
    pdf_type: Literal["digital", "scanned"]
    page_count: int
    text_content: str | None
    page_images: list[str] | None
    file_hash: str


def _detect_pdf_type_sync(file_bytes: bytes) -> Literal["digital", "scanned"]:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        total_text = ""
        for page in pdf.pages:
            text = page.extract_text() or ""
            total_text += text
        cleaned = re.sub(r"\s+", "", total_text)
        return "digital" if len(cleaned) >= 100 else "scanned"


def _extract_all_pages_text_sync(file_bytes: bytes) -> str:
    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            parts.append(page.extract_text() or "")
    return PAGE_BREAK.join(parts)


def _get_page_count_sync(file_bytes: bytes) -> int:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return len(pdf.pages)


def _resize_image(image: Image.Image) -> Image.Image:
    width, height = image.size
    max_dim = max(width, height)
    if max_dim <= MAX_IMAGE_DIMENSION:
        return image
    scale = MAX_IMAGE_DIMENSION / max_dim
    new_size = (int(width * scale), int(height * scale))
    return image.resize(new_size, Image.Resampling.LANCZOS)


def _render_pages_to_base64_sync(file_bytes: bytes, page_indices: list[int]) -> list[str]:
    images = convert_from_bytes(file_bytes, dpi=RENDER_DPI)
    result: list[str] = []
    for idx in page_indices:
        if 0 <= idx < len(images):
            img = _resize_image(images[idx])
            buffer = io.BytesIO()
            img.convert("RGB").save(buffer, format="JPEG", quality=JPEG_QUALITY)
            encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
            result.append(encoded)
    return result


def _select_pages_to_render(page_count: int) -> list[int]:
    if page_count <= 0:
        return []
    indices = sorted({0, min(1, page_count - 1), page_count - 1})
    return indices[:3]


async def detect_pdf_type(file_bytes: bytes) -> Literal["digital", "scanned"]:
    return await asyncio.to_thread(_detect_pdf_type_sync, file_bytes)


async def process_pdf(file_bytes: bytes) -> PDFProcessingResult:
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    pdf_type = await detect_pdf_type(file_bytes)
    page_count = await asyncio.to_thread(_get_page_count_sync, file_bytes)

    if pdf_type == "digital":
        text = await asyncio.to_thread(_extract_all_pages_text_sync, file_bytes)
        return PDFProcessingResult(
            pdf_type="digital",
            page_count=page_count,
            text_content=text,
            page_images=None,
            file_hash=file_hash,
        )

    pages_to_render = _select_pages_to_render(page_count)
    images = await asyncio.to_thread(
        _render_pages_to_base64_sync, file_bytes, pages_to_render
    )
    return PDFProcessingResult(
        pdf_type="scanned",
        page_count=page_count,
        text_content=None,
        page_images=images,
        file_hash=file_hash,
    )
