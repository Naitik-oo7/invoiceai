from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.export import fetch_invoices_for_export, generate_csv, generate_excel

router = APIRouter()


def _parse_optional_date(value: str | None) -> date | None:
    """Parse an ISO date query param, treating empty strings as absent."""
    if not value:
        return None
    return date.fromisoformat(value)


@router.get("/csv")
async def export_csv(
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    invoices = await fetch_invoices_for_export(
        db,
        status,
        _parse_optional_date(date_from),
        _parse_optional_date(date_to),
        search,
    )
    content = generate_csv(invoices)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="invoices.csv"'},
    )


@router.get("/excel")
async def export_excel(
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    invoices = await fetch_invoices_for_export(
        db,
        status,
        _parse_optional_date(date_from),
        _parse_optional_date(date_to),
        search,
    )
    content = generate_excel(invoices)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="invoices.xlsx"'},
    )
