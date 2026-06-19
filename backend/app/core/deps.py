from collections import defaultdict, deque
from datetime import UTC, datetime
from time import time
from uuid import UUID

from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import RateLimitError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

_rate_limit_store: dict[str, deque[float]] = defaultdict(deque)


def check_rate_limit(user_id: UUID) -> None:
    now = time()
    window = 60.0
    key = str(user_id)
    timestamps = _rate_limit_store[key]

    while timestamps and now - timestamps[0] > window:
        timestamps.popleft()

    if len(timestamps) >= settings.RATE_LIMIT_PER_MINUTE:
        retry_after = int(window - (now - timestamps[0])) + 1
        raise RateLimitError(
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            code="RATE_LIMIT_EXCEEDED",
        )

    timestamps.append(now)


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError(detail="Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError()
    except ValueError as exc:
        raise UnauthorizedError(detail="Invalid or expired token") from exc

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedError(detail="User not found or inactive")
    return user


async def require_rate_limit(user: User = Depends(get_current_user)) -> User:
    check_rate_limit(user.id)
    return user
