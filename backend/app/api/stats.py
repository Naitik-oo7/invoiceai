from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.invoice import InvoiceResponse, StatsResponse

router = APIRouter()


@router.get("", response_model=StatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StatsResponse:
    now = datetime.now(UTC)
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if this_month_start.month == 1:
        last_month_start = this_month_start.replace(year=this_month_start.year - 1, month=12)
    else:
        last_month_start = this_month_start.replace(month=this_month_start.month - 1)

    total_result = await db.execute(select(func.count()).select_from(Invoice))
    total_invoices = total_result.scalar() or 0

    status_counts = {}
    for s in InvoiceStatus:
        r = await db.execute(
            select(func.count()).select_from(Invoice).where(Invoice.status == s.value)
        )
        status_counts[s.value] = r.scalar() or 0

    approved_amount_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
            Invoice.status == InvoiceStatus.APPROVED.value
        )
    )
    total_approved_amount = Decimal(str(approved_amount_result.scalar() or 0))

    avg_conf_result = await db.execute(
        select(func.avg(Invoice.overall_confidence)).where(
            Invoice.overall_confidence.isnot(None)
        )
    )
    average_confidence = avg_conf_result.scalar()

    cost_this_month = await db.execute(
        select(func.coalesce(func.sum(Invoice.extraction_cost_usd), 0)).where(
            Invoice.extracted_at >= this_month_start
        )
    )
    extraction_cost_this_month = Decimal(str(cost_this_month.scalar() or 0))

    cost_last_month = await db.execute(
        select(func.coalesce(func.sum(Invoice.extraction_cost_usd), 0)).where(
            Invoice.extracted_at >= last_month_start,
            Invoice.extracted_at < this_month_start,
        )
    )
    extraction_cost_last_month = Decimal(str(cost_last_month.scalar() or 0))

    recent_result = await db.execute(
        select(Invoice).order_by(Invoice.created_at.desc()).limit(10)
    )
    recent_invoices = recent_result.scalars().all()

    return StatsResponse(
        total_invoices=total_invoices,
        pending_review=status_counts.get(InvoiceStatus.REVIEW_PENDING.value, 0),
        approved=status_counts.get(InvoiceStatus.APPROVED.value, 0),
        rejected=status_counts.get(InvoiceStatus.REJECTED.value, 0),
        failed=status_counts.get(InvoiceStatus.FAILED.value, 0),
        total_approved_amount=total_approved_amount,
        average_confidence=float(average_confidence) if average_confidence else None,
        extraction_cost_this_month=extraction_cost_this_month,
        extraction_cost_last_month=extraction_cost_last_month,
        recent_invoices=[InvoiceResponse.model_validate(i) for i in recent_invoices],
    )
