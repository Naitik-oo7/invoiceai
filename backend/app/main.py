import logging
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import auth, export, invoices, stats
from app.core.config import settings
from app.core.exceptions import AppException
from app.db.session import engine

logger = logging.getLogger(__name__)

app = FastAPI(title="InvoiceAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, dict) else {"detail": str(exc.detail), "code": "ERROR"}
    headers = {}
    if exc.status_code == 429:
        headers["Retry-After"] = "60"
    return JSONResponse(status_code=exc.status_code, content=detail, headers=headers)


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["invoices"])
app.include_router(export.router, prefix="/api/invoices/export", tags=["export"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])


@app.get("/health")
async def health_check() -> dict:
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception as exc:
        logger.warning("Health check DB failed: %s", exc)

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "ok" if db_ok else "error",
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "timestamp": datetime.now(UTC).isoformat(),
    }
