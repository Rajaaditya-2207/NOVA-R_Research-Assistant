import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "supersecret")
    SESSION_TYPE = os.getenv("SESSION_TYPE", "filesystem")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/novar.db")

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_DISCOVERY_URL = os.getenv("GOOGLE_DISCOVERY_URL")

    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
    LLM_MODEL = os.getenv("LLM_MODEL", "nvidia/Nemotron-4-340B-Instruct")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nvidia/nemotron-4-embedding")
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", 4))

    SEARCH_PROVIDER = os.getenv("SEARCH_PROVIDER", "duckduckgo")
    SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 52428800))
