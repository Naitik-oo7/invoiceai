from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice


async def check_for_duplicates(
    db: AsyncSession,
    file_hash: str,
    vendor_name: str | None,
    invoice_number: str | None,
    exclude_id: str | None = None,
) -> list[Invoice]:
    duplicates: list[Invoice] = []

    file_query = select(Invoice).where(Invoice.file_hash == file_hash)
    if exclude_id:
        file_query = file_query.where(Invoice.id != exclude_id)
    file_match = await db.execute(file_query)
    duplicates.extend(file_match.scalars().all())

    if vendor_name and invoice_number:
        existing_ids = [d.id for d in duplicates]
        field_query = select(Invoice).where(
            func.lower(Invoice.vendor_name) == vendor_name.lower(),
            Invoice.invoice_number == invoice_number,
        )
        if existing_ids:
            field_query = field_query.where(Invoice.id.notin_(existing_ids))
        if exclude_id:
            field_query = field_query.where(Invoice.id != exclude_id)
        field_match = await db.execute(field_query)
        duplicates.extend(field_match.scalars().all())

    return duplicates
