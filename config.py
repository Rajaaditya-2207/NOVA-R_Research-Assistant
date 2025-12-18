import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "supersecret-change-in-production")
    SESSION_TYPE = os.getenv("SESSION_TYPE", "filesystem")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/novar.db")
    
    # Session Cookie Configuration (for cross-origin OAuth)
    SESSION_COOKIE_SAMESITE = 'Lax'  # Allow cookies in OAuth redirects
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_NAME = 'novar_session'
    # Don't set SESSION_COOKIE_DOMAIN - let each origin have its own cookies

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
    
    # Authentication Mode
    AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() == "true"
    
    # Frontend URL (for OAuth redirects)
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # NVIDIA API Configuration
    NVIDIA_TEXT_API_KEY = os.getenv("NVIDIA_TEXT_API_KEY")
    NVIDIA_EMBED_API_KEY = os.getenv("NVIDIA_EMBED_API_KEY")
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")  # Legacy single-key support
    NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_CHAT_ENDPOINT = os.getenv("NVIDIA_CHAT_ENDPOINT")
    
    # AI Model Configuration
    LLM_MODEL = os.getenv("LLM_MODEL", "nvidia/llama-3.1-nemotron-ultra-253b-v1")
    VISION_MODEL = os.getenv("VISION_MODEL", "meta/llama-3.2-90b-vision-instruct")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5")
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", 4))

    # Web Search Configuration
    SEARCH_PROVIDER = os.getenv("SEARCH_PROVIDER", "duckduckgo")
    SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")

    # File Upload Configuration
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 52428800))  # 50MB
    MAX_DOCUMENTS_PER_SESSION = int(os.getenv("MAX_DOCUMENTS_PER_SESSION", 5))
