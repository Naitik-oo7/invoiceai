from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://invoiceai:invoiceai@localhost:5432/invoiceai"
    SECRET_KEY: str = "change-me-in-production-use-64-char-hex-string-minimum-length"
    OPENAI_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"
    MAX_UPLOAD_MB: int = 10
    RATE_LIMIT_PER_MINUTE: int = 10
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    ALGORITHM: str = "HS256"


settings = Settings()
