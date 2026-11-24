"""Health check used by deployment platforms and monitoring."""

from flask import Blueprint, jsonify

from ..database import get_db
from ..errors import AppError

bp = Blueprint("health", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    try:
        get_db().command("ping")
        database = "connected"
    except Exception as exc:  # pragma: no cover - depends on infrastructure
        raise AppError("Database is unavailable.", status_code=503, code="service_unavailable") from exc
    return jsonify({"status": "ok", "database": database})
