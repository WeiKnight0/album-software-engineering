"""Application configuration for the album-rag service."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "prod"
    artifacts_dir: str = "./dev/output"

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 2048

    embedding_model: str = "BAAI/bge-small-zh-v1.5"
    embedding_device: str = "auto"
    embedding_normalize: bool = True

    qdrant_path: str = "./qdrant_data"
    collection_name: str = "photo_rag"
    vector_size: int = 512

    image_dir: str = ""
    batch_size: int = 1
    skip_existing: bool = True
    default_user_id: int = 0

    @property
    def app_env_normalized(self) -> str:
        return self.app_env.strip().lower() or "prod"

    @property
    def is_dev(self) -> bool:
        return self.app_env_normalized in {"dev", "test"}

    @property
    def artifacts_dir_path(self) -> Path:
        return Path(self.artifacts_dir).resolve()

    @property
    def qdrant_path_absolute(self) -> Path:
        return Path(self.qdrant_path).resolve()

    @property
    def image_dir_path(self) -> Path:
        return Path(self.image_dir).resolve()

    @property
    def ingest_tracker_path(self) -> Path:
        return self.artifacts_dir_path / "ingested.json"

    @property
    def ingest_metrics_path(self) -> Path:
        return self.artifacts_dir_path / "ingest_metrics.json"

    @property
    def viewer_output_path(self) -> Path:
        return self.artifacts_dir_path / "viewer.html"


settings = Settings()
