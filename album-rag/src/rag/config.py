from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    embedding_model: str = "BAAI/bge-small-zh-v1.5"
    embedding_device: str = "auto"
    embedding_normalize: bool = True

    qdrant_path: str = "./qdrant_data"
    collection_name: str = "photo_rag"
    vector_size: int = 512

    @property
    def qdrant_path_absolute(self) -> Path:
        return Path(self.qdrant_path).resolve()


settings = Settings()
