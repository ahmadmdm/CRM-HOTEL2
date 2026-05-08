import json
import secrets
from typing import Any, List, Literal, Self

from pydantic import Field, ValidationError, field_validator, model_validator
from pydantic_settings import (
    BaseSettings,
    DotEnvSettingsSource,
    EnvSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)


class _RawAllowedOriginsMixin:
    def prepare_field_value(
        self, field_name: str, field: Any, value: Any, value_is_complex: bool
    ) -> Any:
        if field_name == "ALLOWED_ORIGINS" and isinstance(value, str):
            return value

        return super().prepare_field_value(field_name, field, value, value_is_complex)


class RawEnvSettingsSource(_RawAllowedOriginsMixin, EnvSettingsSource):
    pass


class RawDotEnvSettingsSource(_RawAllowedOriginsMixin, DotEnvSettingsSource):
    pass


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # Application
    ENVIRONMENT: Literal["development", "test", "staging", "production"] = "development"
    APP_NAME: str = "نظام إدارة الوحدات السكنية"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False
    REQUEST_ID_HEADER: str = "X-Request-ID"

    # Database
    POSTGRES_USER: str = "crm_user"
    POSTGRES_PASSWORD: str = "crm_password"
    POSTGRES_DB: str = "crm_db"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str | None = None
    DATABASE_SYNC_URL: str | None = None

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # JWT
    SECRET_KEY: str | None = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    REFRESH_COOKIE_NAME: str = "crm_refresh_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    AUTH_LOGIN_RATE_LIMIT: str = "5/minute"
    AUTH_REFRESH_RATE_LIMIT: str = "20/minute"

    # Push Notifications (OneSignal)
    ONESIGNAL_APP_ID: str | None = None
    ONESIGNAL_REST_API_KEY: str | None = None
    ONESIGNAL_API_URL: str = "https://api.onesignal.com/notifications?c=push"

    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://frontend:3000"]
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            RawEnvSettingsSource(settings_cls),
            RawDotEnvSettingsSource(settings_cls),
            file_secret_settings,
        )

    # File Storage
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/webp"]
    )

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | List[str]) -> List[str]:
        if isinstance(value, list):
            return value

        if not value:
            return []

        normalized = value.strip()
        if normalized.startswith("["):
            parsed = json.loads(normalized)
            if isinstance(parsed, list):
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
            raise ValueError("ALLOWED_ORIGINS must be a JSON array or comma-separated string")

        return [origin.strip() for origin in normalized.split(",") if origin.strip()]

    @model_validator(mode="before")
    @classmethod
    def require_explicit_production_secrets(cls, data: dict) -> dict:
        environment = data.get("ENVIRONMENT", "development")
        if environment not in {"staging", "production"}:
            return data

        missing = [
            field_name
            for field_name in ("DATABASE_URL", "DATABASE_SYNC_URL", "SECRET_KEY")
            if not data.get(field_name)
        ]
        if missing:
            raise ValueError(
                f"Missing required production settings: {', '.join(missing)}"
            )
        return data

    @model_validator(mode="after")
    def finalize_runtime_settings(self) -> Self:
        if not self.DATABASE_URL:
            self.DATABASE_URL = self._build_async_db_url()

        if not self.DATABASE_SYNC_URL:
            self.DATABASE_SYNC_URL = self._build_sync_db_url()

        if not self.SECRET_KEY:
            if self.ENVIRONMENT in {"development", "test"}:
                self.SECRET_KEY = secrets.token_urlsafe(32)
            else:
                raise ValueError("SECRET_KEY must be set outside development and test")

        self._validate_runtime_safety()
        self.LOG_LEVEL = self.LOG_LEVEL.upper()
        return self

    def _build_async_db_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    def _build_sync_db_url(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    def _validate_runtime_safety(self) -> None:
        if self.ENVIRONMENT not in {"staging", "production"}:
            return

        errors: list[str] = []

        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32 or "CHANGE_THIS" in self.SECRET_KEY:
            errors.append("SECRET_KEY must be explicitly set to a strong value in staging/production")

        if not self.COOKIE_SECURE:
            errors.append("COOKIE_SECURE must be true in staging/production")

        if "CHANGE_THIS" in self.DATABASE_URL or "CHANGE_THIS" in self.DATABASE_SYNC_URL:
            errors.append("Database URLs cannot contain placeholder credentials in staging/production")

        if any("localhost" in origin for origin in self.ALLOWED_ORIGINS):
            errors.append("ALLOWED_ORIGINS cannot include localhost in staging/production")

        if errors:
            raise ValueError("; ".join(errors))


settings = Settings()
