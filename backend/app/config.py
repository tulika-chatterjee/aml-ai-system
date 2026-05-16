from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AML AI System"
    debug: bool = False

    # SQLite fallback keeps local demo running without external services.
    database_url: str = "sqlite+aiosqlite:///./aml_intel.db"

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"

    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic_transactions: str = "aml.transactions.raw"

    openai_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"

    regulatory_docs_path: str = "data/regulatory"


def regulatory_docs_dir(settings: Settings) -> Path:
    p = Path(settings.regulatory_docs_path)
    return p if p.is_absolute() else REPO_ROOT / p


@lru_cache
def get_settings() -> Settings:
    return Settings()
