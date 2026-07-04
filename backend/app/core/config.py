"""Application configuration loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "MindMesh"
    environment: str = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000"
    data_dir: str = "/app/data"

    # Qdrant
    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection: str = "mindmesh"

    # Ollama
    # Defaults tuned for CPU-only / 16 GB laptops. For a powerful machine or
    # GPU, switch to llm_model=qwen3:8b and embedding_model=bge-m3 (dim 1024).
    ollama_url: str = "http://ollama:11434"
    llm_model: str = "qwen2.5:3b"
    embedding_model: str = "nomic-embed-text"
    embedding_dim: int = 768

    # Instagram (optional - enables authenticated access to posts)
    ig_username: str = ""
    ig_password: str = ""

    # Crawl4AI
    crawl4ai_headless: bool = True
    crawl4ai_cache_mode: str = "bypass"

    # Ingestion / retrieval
    chunk_size: int = 800
    chunk_overlap: int = 120
    top_k: int = 5

    # PDF Pipeline
    pdf_max_file_size: int = 100 * 1024 * 1024  # 100 MB
    pdf_ocr_dpi: int = 300
    pdf_min_text_per_page: int = 40

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
