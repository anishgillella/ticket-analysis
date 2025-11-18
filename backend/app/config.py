"""Configuration management for the application."""

import os
from typing import Optional
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql://postgres:postgres@db:5432/ticket_analysis"
    
    # LLM API
    openrouter_api_key: Optional[str] = None
    
    # Observability - LangFuse
    langfuse_public_key: Optional[str] = None
    langfuse_secret_key: Optional[str] = None
    langfuse_base_url: Optional[str] = "https://cloud.langfuse.com"
    
    # Server
    environment: str = "development"  # Set to 'production' in prod environment
    debug: bool = False  # Always False in production
    api_port: int = 8000
    
    # Timeouts (in seconds)
    db_pool_size: int = 10
    db_max_overflow: int = 20
    request_timeout: int = 30
    llm_request_timeout: int = 60
    
    class Config:
        # Look for .env in the backend directory
        env_file = str(Path(__file__).parent.parent / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Set environment variables for LangFuse (needed before importing langfuse)
if settings.langfuse_public_key:
    import os
    os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key
if settings.langfuse_secret_key:
    import os
    os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key
if settings.langfuse_base_url:
    import os
    os.environ["LANGFUSE_BASE_URL"] = settings.langfuse_base_url

# Debug logging - don't expose API key details
if settings.openrouter_api_key:
    print(f"✅ OPENROUTER_API_KEY loaded successfully")
else:
    print(f"⚠️  OPENROUTER_API_KEY not found in environment")

