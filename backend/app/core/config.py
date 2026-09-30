"""Application configuration loaded from environment variables."""
from functools import lru_cache
from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "MindMesh"
    environment: str = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    data_dir: str = "/app/data"

    # Security — when set and ENVIRONMENT=production, mutating endpoints
    # require an X-API-Key header matching this value.
    api_key: str = ""

    # Uploads
    max_upload_size: int = 200 * 1024 * 1024  # 200 MB

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
    # Set ig_username and ig_password to access private posts or posts
    # that require login. When empty, public posts are accessed without auth.
    # Required for: private accounts, age-restricted content, stories
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

    @property
    def embedding_dim_for_model(self) -> int:
        """Return the correct embedding dimension for the configured model."""
        model_dims = {
            "nomic-embed-text": 768,
            "bge-m3": 1024,
            "mxbai-embed-large": 1024,
            "all-minilm": 384,
        }
        return model_dims.get(self.embedding_model, self.embedding_dim)

    @model_validator(mode="after")
    def validate_critical_settings(self) -> "Settings":
        """Validate critical settings at startup."""
        import logging
        logger = logging.getLogger(__name__)
        
        if self.environment == "production":
            if self.cors_origins == "http://localhost:3000,http://127.0.0.1:3000":
                logger.warning("CORS origins are set to localhost in production! Set CORS_ORIGINS env var.")
            if self.data_dir == "/app/data":
                logger.warning("Using default data_dir in production. Set DATA_DIR env var.")
        
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
