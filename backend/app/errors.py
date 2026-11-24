"""Centralised, JSON-only error handling for the API."""

import logging
from flask import jsonify, request
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base exception for expected API failures."""

    status_code = 400
    code = "bad_request"

    def __init__(self, message, status_code=None, details=None, code=None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.details = details


class ValidationError(AppError):
    status_code = 400
    code = "validation_error"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


def error_response(error):
    payload = {
        "success": False,
        "error": {
            "code": getattr(error, "code", "error"),
            "message": getattr(error, "message", str(error)),
        },
    }
    details = getattr(error, "details", None)
    if details:
        payload["error"]["details"] = details
    status = getattr(error, "status_code", 500)
    return jsonify(payload), status


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(error):
        return error_response(error)

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        code = "not_found" if error.code == 404 else "http_error"
        return error_response(
            AppError(error.description, status_code=error.code, code=code)
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        logger.exception("Unhandled error on %s %s", request.method, request.path)
        return error_response(
            AppError(
                "An unexpected error occurred. Please try again later.",
                status_code=500,
                code="internal_error",
            )
        )
