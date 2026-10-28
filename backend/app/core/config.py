"""Typed runtime configuration.

Every infrastructure dependency is configured through environment variables so
the same image can run locally (SQLite + mock LLM) and in production
(MySQL + OpenAI-compatible LLM) without code changes.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "知问 API"
    app_version: str = "1.0.0"
    environment: str = "development"
    api_prefix: str = "/api"

    # --- Security ---
    # Replace in production; startup logs a warning for the dev default.
    secret_key: str = "dev-only-secret-change-me-in-production-please"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Database ---
    # SQLite is the zero-dependency dev/test fallback; Compose injects MySQL.
    database_url: str = "sqlite+aiosqlite:///./data/chat.db"
    auto_create_tables: bool = True
    sql_echo: bool = False

    # --- LLM (OpenAI-compatible) ---
    # mock keeps the app usable without a key; deepseek/openai require one.
    llm_provider: str = "mock"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"
    llm_timeout_seconds: float = 60.0
    mock_stream_delay: float = 0.008

    # --- Retrieval ---
    # Scores are normalized to 0-1 before this threshold is applied.
    retrieval_top_k: int = 5
    retrieval_min_score: float = 0.15
    retrieval_max_chunks: int = 20000

    # Uploads
    max_upload_mb: int = 10
    chunk_size: int = 500
    chunk_overlap: int = 80

    # Limits
    rate_limit_enabled: bool = True

    @field_validator("llm_provider")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in {"mock", "openai", "deepseek"}:
            raise ValueError("LLM_PROVIDER must be mock, openai or deepseek")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def llm_is_configured(self) -> bool:
        return self.llm_provider != "mock" and bool(self.llm_api_key)

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
