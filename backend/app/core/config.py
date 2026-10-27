"""환경변수 설정. 형준(공통 통합) 담당. 값은 backend/.env 또는 OS 환경변수에서 읽습니다."""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_env: str = "local"
    database_url: str = ""
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    supabase_url: str = ""
    supabase_anon_key: str = ""

    @field_validator("database_url")
    @classmethod
    def _require_asyncpg(cls, value: str) -> str:
        if value and not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL 은 postgresql+asyncpg:// 로 시작해야 합니다.")
        return value

    @property
    def cors_origins(self) -> list[str]:
        origins = [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]
        if "*" in origins:
            raise ValueError("CORS_ALLOW_ORIGINS 에 * 는 사용할 수 없습니다.")
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
