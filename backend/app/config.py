"""Application configuration, sourced from environment variables."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    """Base configuration used in development, testing and production."""

    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-flask-secret-change-me")
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = ENV == "development"

    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "blogsphere")

    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret-change-me")
    JWT_EXPIRES_IN = int(os.getenv("JWT_EXPIRES_IN", str(7 * 24 * 60 * 60)))

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
        ).split(",")
        if origin.strip()
    ]

    # Emails in this list receive the admin role at registration time.
    ADMIN_EMAILS = {
        email.strip().lower()
        for email in os.getenv("ADMIN_EMAILS", "").split(",")
        if email.strip()
    }

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "uploads"))
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

    # When set (e.g. https://blog-api.onrender.com), uploaded image URLs are
    # returned as absolute URLs so a separately hosted frontend can use them.
    PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "").rstrip("/")
