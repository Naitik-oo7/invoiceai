import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice, InvoiceStatus
from app.services.duplicates import check_for_duplicates


@pytest.mark.asyncio
async def test_file_hash_duplicate(db_session: AsyncSession):
    inv = Invoice(
        id=uuid.uuid4(),
        status=InvoiceStatus.REVIEW_PENDING.value,
        original_filename="test.pdf",
        file_hash="hash123",
        vendor_name="Acme",
        invoice_number="INV-001",
    )
    db_session.add(inv)
    await db_session.flush()

    duplicates = await check_for_duplicates(db_session, "hash123", "Acme", "INV-001")
    assert len(duplicates) == 1
    assert duplicates[0].id == inv.id


@pytest.mark.asyncio
async def test_vendor_invoice_duplicate(db_session: AsyncSession):
    inv = Invoice(
        id=uuid.uuid4(),
        status=InvoiceStatus.APPROVED.value,
        original_filename="test.pdf",
        file_hash="hash456",
        vendor_name="Beta Corp",
        invoice_number="INV-002",
    )
    db_session.add(inv)
    await db_session.flush()

    duplicates = await check_for_duplicates(db_session, "different_hash", "Beta Corp", "INV-002")
    assert len(duplicates) == 1


@pytest.mark.asyncio
async def test_no_false_positive(db_session: AsyncSession):
    inv = Invoice(
        id=uuid.uuid4(),
        status=InvoiceStatus.REVIEW_PENDING.value,
        original_filename="test.pdf",
        file_hash="hash789",
        vendor_name="Gamma",
        invoice_number="INV-003",
    )
    db_session.add(inv)
    await db_session.flush()

    duplicates = await check_for_duplicates(db_session, "unique_hash", "Delta", "INV-999")
    assert len(duplicates) == 0
