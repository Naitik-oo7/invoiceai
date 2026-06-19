from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

LLMProvider = Literal["openai", "gemini"]

_ROOT_DIR = Path(__file__).resolve().parents[3]
_BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            _ROOT_DIR / ".env",
            _BACKEND_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://invoiceai:invoiceai@localhost:5432/invoiceai"
    SECRET_KEY: str = "change-me-in-production-use-64-char-hex-string-minimum-length"
    LLM_PROVIDER: LLMProvider = "openai"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002"
    )
    ENVIRONMENT: str = "development"
    MAX_UPLOAD_MB: int = 10
    RATE_LIMIT_PER_MINUTE: int = 10
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    ALGORITHM: str = "HS256"


    @field_validator("DATABASE_URL")
    @classmethod
    def _ensure_asyncpg_driver(cls, v: str) -> str:
        # Managed Postgres providers (Render, Railway, Heroku, etc.) hand out a
        # plain "postgres://" / "postgresql://" URL. SQLAlchemy's async engine
        # needs the asyncpg driver, so normalize the scheme here.
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v


settings = Settings()


def get_cors_origins() -> list[str]:
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
        origins.append(settings.FRONTEND_URL)
    return origins
