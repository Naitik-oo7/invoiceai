"""Seed the database with a realistic demo user and invoices.

Run from the backend directory (uses the same DATABASE_URL / .env as the app):

    python seed.py            # insert demo data (skips if invoices already exist)
    python seed.py --reset    # delete all existing invoices first, then seed

The data is shaped to make the dashboard, list and review pages look populated:
spread across all four statuses, varied vendors/currencies/confidence, and
extraction costs dated into the current and previous month so the stats cards
show non-zero "this month" / "last month" figures.
"""

import asyncio
import hashlib
import random
import sys
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.invoice import (
    ExtractionMethod,
    Invoice,
    InvoiceStatus,
    PdfType,
)
from app.models.user import User

# Deterministic output run-to-run.
random.seed(42)

DEMO_USER = {
    "email": "demo@invoiceai.app",
    "full_name": "Demo User",
    "password": "Demo@1234",
}

# (vendor, currency, locale, model, typical total range)
VENDORS = [
    ("Amazon Web Services", "USD", "en-US", "gpt-4o", (180, 4200)),
    ("Google Cloud Platform", "USD", "en-US", "gemini-2.0-flash", (90, 3100)),
    ("GitHub, Inc.", "USD", "en-US", "gpt-4o", (21, 210)),
    ("Figma, Inc.", "USD", "en-US", "gemini-2.0-flash", (12, 540)),
    ("Adobe Systems", "USD", "en-US", "gpt-4o", (52, 599)),
    ("Notion Labs", "USD", "en-US", "gemini-2.0-flash", (8, 160)),
    ("Slack Technologies", "USD", "en-US", "gpt-4o", (87, 720)),
    ("DigitalOcean LLC", "USD", "en-US", "gemini-2.0-flash", (24, 480)),
    ("Vercel Inc.", "USD", "en-US", "gpt-4o", (20, 350)),
    ("Stripe Payments", "USD", "en-US", "gemini-2.0-flash", (45, 980)),
    ("Cloudflare, Inc.", "USD", "en-US", "gpt-4o", (20, 250)),
    ("Atlassian Pty Ltd", "AUD", "en-AU", "gemini-2.0-flash", (75, 1100)),
    ("Microsoft Ireland", "EUR", "en-IE", "gpt-4o", (110, 2300)),
    ("Zoom Video Comms", "USD", "en-US", "gemini-2.0-flash", (15, 320)),
    ("Hetzner Online GmbH", "EUR", "de-DE", "gpt-4o", (8, 220)),
    ("OVHcloud SAS", "EUR", "fr-FR", "gemini-2.0-flash", (12, 410)),
    ("Tata Consultancy Svcs", "INR", "en-IN", "gpt-4o", (24000, 480000)),
    ("Infosys Ltd", "INR", "en-IN", "gemini-2.0-flash", (18000, 360000)),
    ("Monzo Bank Ltd", "GBP", "en-GB", "gpt-4o", (9, 140)),
    ("Linear Orbit Inc.", "USD", "en-US", "gemini-2.0-flash", (8, 96)),
]

CONF_FIELDS = [
    "invoice_number",
    "vendor_name",
    "invoice_date",
    "due_date",
    "total_amount",
    "tax_amount",
]


def _confidence(low: bool) -> dict[str, float]:
    """Per-field confidence; `low` injects a couple of weak fields."""
    conf = {}
    for f in CONF_FIELDS:
        if low and f in ("due_date", "tax_amount"):
            conf[f] = round(random.uniform(0.45, 0.72), 2)
        else:
            conf[f] = round(random.uniform(0.86, 0.99), 2)
    return conf


def _warnings(conf: dict[str, float], tax: Decimal, total: Decimal) -> dict[str, str]:
    warnings: dict[str, str] = {}
    labels = {
        "invoice_number": "Invoice number",
        "vendor_name": "Vendor name",
        "invoice_date": "Invoice date",
        "due_date": "Due date",
        "total_amount": "Total amount",
        "tax_amount": "Tax amount",
    }
    for field, label in labels.items():
        if conf.get(field, 1.0) < 0.75:
            warnings[field] = f"Low confidence ({int(conf[field] * 100)}%) — please verify"
    if tax > total:
        warnings["tax_amount"] = (
            f"Tax amount ({tax}) is larger than total ({total}) — likely an extraction error"
        )
    return warnings


def _make_invoice(user_id, seq: int, status: str, ref_today: date) -> Invoice:
    vendor, currency, locale, model, (lo, hi) = random.choice(VENDORS)

    # Dates: invoice date within the last ~75 days, due 14-30 days later.
    inv_date = ref_today - timedelta(days=random.randint(1, 75))
    due_date = inv_date + timedelta(days=random.choice([14, 15, 30, 30, 45]))

    total = Decimal(str(round(random.uniform(lo, hi), 2)))
    tax_rate = random.choice([Decimal("0"), Decimal("0.05"), Decimal("0.18"), Decimal("0.20")])
    tax = (total * tax_rate / (1 + tax_rate)).quantize(Decimal("0.01"))

    is_scanned = random.random() < 0.3
    low_conf = status in (InvoiceStatus.REVIEW_PENDING.value, InvoiceStatus.REJECTED.value)
    conf = _confidence(low_conf)
    overall = round(sum(conf.values()) / len(conf), 3)

    invoice_number = f"INV-{inv_date.year}-{1000 + seq}"
    filename = f"{vendor.split(',')[0].split(' ')[0].lower()}_{invoice_number}.pdf"
    file_hash = hashlib.sha256(f"{filename}-{seq}".encode()).hexdigest()

    pages = random.randint(1, 3) if is_scanned else 1
    tokens_in = random.randint(900, 2600) if is_scanned else random.randint(400, 1100)
    tokens_out = random.randint(180, 420)
    if model.startswith("gpt"):
        cost = Decimal(str(round(tokens_in / 1_000_000 * 2.5 + tokens_out / 1_000_000 * 10, 4)))
        cost = max(cost, Decimal("0.0020"))
        if is_scanned:
            cost += Decimal("0.0150") * pages
    else:  # gemini — much cheaper
        cost = Decimal(str(round(tokens_in / 1_000_000 * 0.1 + tokens_out / 1_000_000 * 0.4, 4)))
        cost = max(cost, Decimal("0.0004"))

    # extracted_at drives the "this month / last month" cost cards — spread it
    # across the current and previous month relative to ref_today.
    days_back = random.randint(0, 55)
    extracted_at = datetime.combine(ref_today, datetime.min.time(), tzinfo=UTC) - timedelta(
        days=days_back, hours=random.randint(0, 23), minutes=random.randint(0, 59)
    )

    ai_fields = {
        "invoice_number": invoice_number,
        "vendor_name": vendor,
        "invoice_date": inv_date.isoformat(),
        "due_date": due_date.isoformat(),
        "total_amount": str(total),
        "tax_amount": str(tax),
        "currency": currency,
    }

    inv = Invoice(
        uploaded_by=user_id,
        status=status,
        original_filename=filename,
        file_hash=file_hash,
        pdf_type=PdfType.SCANNED.value if is_scanned else PdfType.DIGITAL.value,
        page_count=pages,
        invoice_number=invoice_number,
        vendor_name=vendor,
        invoice_date=inv_date,
        due_date=due_date,
        total_amount=total,
        tax_amount=tax,
        currency=currency,
        detected_locale=locale,
        field_confidence=conf,
        field_warnings=_warnings(conf, tax, total),
        overall_confidence=overall,
        validation_errors=[],
        extraction_model=model,
        extraction_method=(
            ExtractionMethod.VISION.value if is_scanned else ExtractionMethod.TEXT.value
        ),
        extraction_attempts=1 if random.random() > 0.15 else 2,
        extraction_tokens_in=tokens_in,
        extraction_tokens_out=tokens_out,
        extraction_cost_usd=cost,
        extraction_duration_ms=random.randint(900, 6500),
        extraction_notes=None,
        ai_extracted_fields=ai_fields,
        extracted_at=extracted_at,
        created_at=extracted_at,
    )

    if status == InvoiceStatus.APPROVED.value:
        inv.reviewed_at = extracted_at + timedelta(hours=random.randint(1, 48))
        inv.reviewed_by = user_id
    elif status == InvoiceStatus.REJECTED.value:
        inv.reviewed_at = extracted_at + timedelta(hours=random.randint(1, 48))
        inv.reviewed_by = user_id
        inv.rejection_reason = random.choice(
            [
                "Duplicate of an invoice already entered this month.",
                "Wrong vendor extracted — totals do not match the PDF.",
                "Test/sample document, not a real invoice.",
            ]
        )
    elif status == InvoiceStatus.FAILED.value:
        inv.status = InvoiceStatus.FAILED.value
        inv.invoice_number = None
        inv.vendor_name = None
        inv.invoice_date = None
        inv.due_date = None
        inv.total_amount = None
        inv.tax_amount = None
        inv.overall_confidence = None
        inv.field_confidence = {}
        inv.field_warnings = {}
        inv.ai_extracted_fields = None
        inv.extraction_notes = "Extraction failed: AI returned malformed output after one retry."
        inv.extraction_cost_usd = Decimal("0.0009")

    return inv


# Roughly weighted status distribution.
STATUS_PLAN = (
    [InvoiceStatus.APPROVED.value] * 16
    + [InvoiceStatus.REVIEW_PENDING.value] * 7
    + [InvoiceStatus.REJECTED.value] * 3
    + [InvoiceStatus.FAILED.value] * 2
)


async def main(reset: bool) -> None:
    ref_today = date.today()
    async with AsyncSessionLocal() as db:
        # --- demo user (idempotent) ---
        result = await db.execute(select(User).where(User.email == DEMO_USER["email"]))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=DEMO_USER["email"],
                full_name=DEMO_USER["full_name"],
                hashed_password=hash_password(DEMO_USER["password"]),
                is_active=True,
            )
            db.add(user)
            await db.flush()
            print(f"Created demo user: {DEMO_USER['email']} / {DEMO_USER['password']}")
        else:
            print(f"Demo user already exists: {DEMO_USER['email']}")

        # --- invoices ---
        if reset:
            await db.execute(delete(Invoice))
            print("Deleted all existing invoices (--reset).")
        else:
            count = (await db.execute(select(func.count()).select_from(Invoice))).scalar() or 0
            if count > 0:
                print(
                    f"{count} invoices already present — skipping insert. "
                    "Re-run with --reset to replace them."
                )
                await db.commit()
                return

        invoices = [
            _make_invoice(user.id, i, status, ref_today)
            for i, status in enumerate(random.sample(STATUS_PLAN, len(STATUS_PLAN)))
        ]
        db.add_all(invoices)
        await db.commit()

        by_status: dict[str, int] = {}
        for inv in invoices:
            by_status[inv.status] = by_status.get(inv.status, 0) + 1
        print(f"Inserted {len(invoices)} invoices:")
        for status, n in sorted(by_status.items()):
            print(f"  {status:16s} {n}")


if __name__ == "__main__":
    asyncio.run(main(reset="--reset" in sys.argv))
