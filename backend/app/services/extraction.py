import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from pydantic import ValidationError

from app.services.llm import calculate_cost, complete_text, complete_vision
from app.services.pdf import PDFProcessingResult
from app.services.validation import (
    ValidatedExtraction,
    generate_field_warnings,
    run_sanity_checks,
    validate_extraction_output,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are an expert invoice data extraction system. Your output is consumed by automated software and must be precise and machine-parseable.

# Your task
Extract these 6 fields from the invoice document:
1. invoice_number — The unique identifier the vendor assigned to this invoice. Look for labels like "Invoice #", "Invoice No.", "Bill No.", "Reference", "Document No.". This is NOT the PO number, account number, or customer number.
2. vendor_name — The COMPANY THAT ISSUED THIS INVOICE (the seller/supplier — the party requesting payment). This is NOT the recipient/buyer/customer.
   - The vendor is typically at the top of the invoice with their logo and contact info
   - The recipient appears in a "Bill To:" or "Sold To:" section
   - When in doubt, the vendor is the one whose bank details appear at the bottom for payment
3. invoice_date — The date the invoice was issued (NOT the due date, NOT the service date if separate)
4. due_date — The payment deadline. Labels: "Due Date", "Payment Due", "Pay By", "Net 30" (calculate from invoice date if only terms given)
5. total_amount — The FINAL AMOUNT DUE after all taxes and discounts. This is usually labeled "Total", "Amount Due", "Grand Total", "Balance Due". When multiple amounts exist (subtotal, tax, total), pick the largest/final one.
6. tax_amount — Total tax/VAT/GST/Sales Tax amount. If multiple tax lines exist, sum them. If no tax shown, return 0 (not null) only if confidence is high that the invoice has no tax; otherwise null.

Also determine:
- currency — 3-letter ISO code (USD, EUR, GBP, INR, AUD, CAD, JPY, etc.). Detect from currency symbols ($, €, £, ₹, ¥), explicit codes, or country context.
- detected_locale — Best guess at locale based on date format and number format seen in document. Use BCP 47 codes (en-US, en-GB, en-IN, de-DE, fr-FR, es-ES, etc.)

# Output format
Return ONLY a valid JSON object. No markdown fences, no preamble, no explanation outside the JSON.

{
  "invoice_number": "<string or null>",
  "vendor_name": "<string or null>",
  "invoice_date": "<YYYY-MM-DD or null>",
  "due_date": "<YYYY-MM-DD or null>",
  "total_amount": <number or null>,
  "tax_amount": <number or null>,
  "currency": "<ISO 4217 code or null>",
  "detected_locale": "<BCP 47 code or null>",
  "confidence": {
    "invoice_number": <float 0.0-1.0>,
    "vendor_name": <float 0.0-1.0>,
    "invoice_date": <float 0.0-1.0>,
    "due_date": <float 0.0-1.0>,
    "total_amount": <float 0.0-1.0>,
    "tax_amount": <float 0.0-1.0>
  },
  "overall_confidence": <float 0.0-1.0>,
  "extraction_notes": "<string — any observations about ambiguities, document quality, or assumptions made. Max 300 chars.>"
}

# Confidence scoring rules (BE STRICT)
- 0.95-1.00: Field is unambiguously labeled and clearly readable. Only one possible interpretation.
- 0.80-0.94: Field is present with minor ambiguity (e.g. label is implicit, or one of two similar values had to be chosen).
- 0.60-0.79: Field is inferred from context, partially readable, or required disambiguation.
- 0.40-0.59: Significant uncertainty. Value might be wrong. ALWAYS pair with explanation in extraction_notes.
- 0.00-0.39: Field is absent or unreadable. Return value as null.

If you cannot find a field with at least 0.40 confidence, set its value to null. Do not guess.

# Date format rules
- Always output ISO 8601: YYYY-MM-DD
- If the document uses ambiguous date format (e.g. "03/04/2025"), use detected_locale to disambiguate:
  - en-US: MM/DD/YYYY
  - en-GB, en-IN, en-AU: DD/MM/YYYY
  - de-DE: DD.MM.YYYY
  - ISO contexts: YYYY-MM-DD
- If locale cannot be determined and date is ambiguous, lower confidence to 0.6 and note the ambiguity in extraction_notes

# Amount format rules
- Output as plain numbers, no currency symbols, no thousands separators
- "$1,234.56" → 1234.56
- "1.234,56 €" → 1234.56 (German format)
- "₹1,23,456.78" → 123456.78 (Indian lakhs format)
- "1,234" with no decimal → 1234 (integer amounts are valid)
- Always use period as decimal separator in output

# Critical anti-patterns to avoid
- DO NOT confuse vendor with buyer/customer/bill-to
- DO NOT pick subtotal when total exists
- DO NOT include currency symbols in amount fields
- DO NOT use placeholder text like "N/A" or "Unknown" — use null
- DO NOT extract PO numbers as invoice numbers
- DO NOT fabricate values — null is always better than wrong
"""


@dataclass
class RawExtractionResult:
    raw_data: dict[str, Any]
    tokens_in: int
    tokens_out: int
    attempts: int = 1


@dataclass
class ExtractionResult:
    fields: ValidatedExtraction
    warnings: dict[str, str]
    method: str
    attempts: int
    tokens_in: int
    tokens_out: int
    cost_usd: float
    duration_ms: int
    raw_data: dict[str, Any] = field(default_factory=dict)


async def _extract_from_text(
    text_content: str,
    filename: str,
    corrective_note: str | None = None,
) -> RawExtractionResult:
    user_message = f"Extract invoice data from this document.\nFilename: {filename}\n\n{text_content}"
    if corrective_note:
        user_message += f"\n\nCORRECTION REQUIRED: Previous response was invalid. Error: {corrective_note}. Return valid JSON only."

    response = await complete_text(SYSTEM_PROMPT, user_message)
    raw_data = json.loads(response.content)
    return RawExtractionResult(
        raw_data=raw_data,
        tokens_in=response.tokens_in,
        tokens_out=response.tokens_out,
    )


async def _extract_from_vision(
    page_images: list[str],
    filename: str,
    corrective_note: str | None = None,
) -> RawExtractionResult:
    user_text = (
        f"Extract invoice data from these document page images.\nFilename: {filename}"
        + (f"\n\nCORRECTION REQUIRED: {corrective_note}" if corrective_note else "")
    )

    response = await complete_vision(SYSTEM_PROMPT, user_text, page_images)
    raw_data = json.loads(response.content)
    return RawExtractionResult(
        raw_data=raw_data,
        tokens_in=response.tokens_in,
        tokens_out=response.tokens_out,
    )


async def extract_invoice_fields(
    pdf_result: PDFProcessingResult,
    filename: str,
    invoice_id: str | None = None,
) -> ExtractionResult:
    start_time = time.time()
    total_tokens_in = 0
    total_tokens_out = 0
    attempts = 1

    if pdf_result.pdf_type == "digital":
        result = await _extract_from_text(pdf_result.text_content or "", filename)
        method = "text"
    else:
        result = await _extract_from_vision(pdf_result.page_images or [], filename)
        method = "vision"

    total_tokens_in += result.tokens_in
    total_tokens_out += result.tokens_out

    try:
        validated = validate_extraction_output(result.raw_data)
    except ValidationError as exc:
        logger.warning("Extraction validation failed, retrying: %s", exc)
        if pdf_result.pdf_type == "digital":
            result = await _extract_from_text(
                pdf_result.text_content or "", filename, corrective_note=str(exc)
            )
        else:
            result = await _extract_from_vision(
                pdf_result.page_images or [], filename, corrective_note=str(exc)
            )
        total_tokens_in += result.tokens_in
        total_tokens_out += result.tokens_out
        attempts = 2
        validated = validate_extraction_output(result.raw_data)

    sanity_warnings = run_sanity_checks(validated)
    field_warnings = generate_field_warnings(validated)
    warnings = {**field_warnings, **sanity_warnings}
    duration_ms = int((time.time() - start_time) * 1000)
    cost = calculate_cost(total_tokens_in, total_tokens_out)

    logger.info(
        "Extraction complete invoice_id=%s method=%s attempts=%s tokens_in=%s tokens_out=%s cost=%s duration_ms=%s success=true",
        invoice_id,
        method,
        attempts,
        total_tokens_in,
        total_tokens_out,
        cost,
        duration_ms,
    )

    return ExtractionResult(
        fields=validated,
        warnings=warnings,
        method=method,
        attempts=attempts,
        tokens_in=total_tokens_in,
        tokens_out=total_tokens_out,
        cost_usd=cost,
        duration_ms=duration_ms,
        raw_data=result.raw_data,
    )
