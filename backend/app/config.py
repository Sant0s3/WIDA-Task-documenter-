"""
Application configuration - loads from environment variables.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file explicitly
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)
if not os.getenv("GEMINI_API_KEY"):
    load_dotenv()

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR / 'wida.db'}"
)

# Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()

# Groq AI Fallback
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()

# JWT Authentication
JWT_SECRET = os.getenv("JWT_SECRET", "wida-secret-key-change-in-production-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Default admin credentials (created on first startup)
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "wida2024"

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
