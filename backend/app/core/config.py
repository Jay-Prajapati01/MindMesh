"""Application configuration loaded from environment variables."""
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", hide_input_in_errors=True)

    # App
    app_name: str = "MindMesh"
    environment: str = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    data_dir: str = "/app/data"
    mindmesh_execution_mode: str = "local"
    modal_app_name: str = "mindmesh-workers"
    modal_environment: str = "main"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_db_url: str = ""
    supabase_storage_bucket: str = "mindmesh-private"
    redis_url: str = ""
    qdrant_api_key: str = ""
    job_ttl_seconds: int = 604800
    worker_process: bool = False
    llm_provider: str = ""
    xai_api_key: str = ""
    xai_model: str = ""
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    # Security — when set (any environment), mutating endpoints require a
    # matching X-API-Key header. Empty keeps local development open.
    # Cloud mode ignores this entirely: membership + bearer always win.
    api_key: str = ""

    # Request body caps enforced in middleware BEFORE parsing (a huge body
    # otherwise buffers/spools to disk before any in-handler size check).
    max_json_body_size: int = 10 * 1024 * 1024  # 10 MB for JSON endpoints
    # multipart: max_upload_size + slack for form fields/boundaries
    max_multipart_body_size: int = 210 * 1024 * 1024

    # SSRF guard for outbound fetches (web ingestion, PDF URLs, crawler).
    # Blocks loopback/private/link-local/metadata addresses. Set to false
    # only if you intentionally ingest pages from internal addresses.
    ssrf_block_private: bool = True

    # Rate limiting — on by default in every environment.
    rate_limit_enabled: bool = True
    rate_limit_max_requests: int = 120
    rate_limit_window: int = 60
    # Identity classes (per user, per tenant fallback to IP when anonymous).
    rate_limit_read_per_min: int = 120
    rate_limit_write_per_min: int = 60
    rate_limit_chat_per_min: int = 30
    rate_limit_poll_per_min: int = 60
    rate_limit_ingest_per_hour: int = 20
    # Per-tenant daily quotas (0 disables the quota).
    max_jobs_per_tenant_per_day: int = 200
    max_upload_bytes_per_tenant_per_day: int = 5 * 1024 * 1024 * 1024  # 5 GB
    # Hard cap on how long the SSE status stream waits for a terminal job.
    sse_max_wait_seconds: int = 7200
    # Retention for mirrored terminal job results in Postgres.
    job_result_retention_days: int = 30
    # Trust X-Forwarded-For only when behind a reverse proxy you control.
    trust_proxy: bool = False

    # Concurrency cap for heavy pipelines (transcription, OCR, downloads).
    max_concurrent_heavy_tasks: int = 2

    # Parser limits (zip bombs, huge PDFs).
    max_pdf_pages: int = 500
    zip_max_uncompressed_bytes: int = 500 * 1024 * 1024  # 500 MB
    zip_max_ratio: int = 200

    # Outbound fetch limits.
    fetch_max_bytes: int = 20 * 1024 * 1024  # 20 MB
    fetch_timeout_seconds: int = 30

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
    # Minimum cosine similarity for a retrieved chunk to be used as context.
    # Chunks below this score are treated as irrelevant so chat answers stay
    # grounded in the user's own content instead of guessing from noise.
    chat_min_score: float = 0.3

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

        # Normalize so "Production"/" PROD" cannot silently disable the
        # API-key guard or the rate limiter (exact-case comparisons before).
        self.environment = self.environment.strip().lower()
        self.mindmesh_execution_mode = self.mindmesh_execution_mode.strip().lower()
        if self.mindmesh_execution_mode not in {"local", "modal", "cloud"}:
            raise ValueError("MINDMESH_EXECUTION_MODE must be local, modal or cloud")
        if self.environment == "production" and self.mindmesh_execution_mode == "local":
            raise ValueError("Production requires a cloud execution mode")
        if self.mindmesh_execution_mode in {"modal", "cloud"}:
            from urllib.parse import urlparse
            if not all((self.supabase_url, self.supabase_anon_key, self.supabase_service_role_key,
                        self.supabase_db_url, self.redis_url, self.qdrant_api_key)):
                raise ValueError("Cloud mode requires Supabase, database, Redis and Qdrant credentials")
            if not self.redis_url.startswith("rediss://"):
                raise ValueError("Cloud Redis must use TLS (rediss://)")
            for endpoint in (self.supabase_url, self.qdrant_url):
                parsed = urlparse(endpoint)
                if parsed.scheme != "https" or parsed.hostname in {"localhost", "127.0.0.1", "qdrant"}:
                    raise ValueError("Cloud service endpoints must use public HTTPS")
            if "sslmode=require" not in self.supabase_db_url and "sslmode=verify-full" not in self.supabase_db_url:
                raise ValueError("SUPABASE_DB_URL must require TLS")
            if self.embedding_model != "bge-m3" or self.embedding_dim != 1024:
                raise ValueError("Modal mode requires EMBEDDING_MODEL=bge-m3 and EMBEDDING_DIM=1024")
            if self.qdrant_collection == "mindmesh":
                raise ValueError("Use a new collection for BGE-M3, e.g. mindmesh_bge_m3_v1")
            if not self.ssrf_block_private or not self.crawl4ai_headless or self.crawl4ai_cache_mode != "bypass":
                raise ValueError("Cloud browsers require SSRF protection, headless mode and disabled page caching")
        if self.mindmesh_execution_mode == "cloud":
            if self.llm_provider not in {"xai", "groq"}:
                raise ValueError("Cloud mode requires an explicit LLM_PROVIDER: xai or groq")
            if self.llm_provider == "xai" and not (self.xai_api_key and self.xai_model):
                raise ValueError("xAI requires XAI_API_KEY and XAI_MODEL")
            if self.llm_provider == "groq" and not self.groq_api_key:
                raise ValueError("Groq requires GROQ_API_KEY")
            from urllib.parse import urlparse
            if any(urlparse(o).scheme != "https" or urlparse(o).hostname in {"localhost", "127.0.0.1"}
                   for o in self.cors_origin_list):
                raise ValueError("Cloud CORS origins must use public HTTPS")

        # allow_credentials=True is hardcoded in main.py; Starlette would
        # reflect any request Origin if "*" were allowed — reject it outright.
        if "*" in self.cors_origin_list:
            raise ValueError(
                "CORS_ORIGINS must not contain '*' when credentials are "
                "allowed. List explicit origins instead."
            )

        if self.environment == "production":
            if self.cors_origins == "http://localhost:3000,http://127.0.0.1:3000":
                logger.warning("CORS origins are set to localhost in production! Set CORS_ORIGINS env var.")
            if self.data_dir == "/app/data":
                logger.warning("Using default data_dir in production. Set DATA_DIR env var.")

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
