"""Password hashing and JWT creation/validation."""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import current_app

from .database import get_db
from .errors import UnauthorizedError


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password, password_hash):
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError, AttributeError):
        return False


def create_access_token(user_id):
    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": issued_at,
        "exp": issued_at + timedelta(seconds=current_app.config["JWT_EXPIRES_IN"]),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_access_token(token, check_blacklist=True):
    try:
        payload = jwt.decode(
            token, current_app.config["JWT_SECRET"], algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Your session has expired. Please log in again.") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Invalid authentication token.") from exc

    if check_blacklist and get_db().token_blacklist.find_one({"token": token}):
        raise UnauthorizedError("This session has ended. Please log in again.")
    if "sub" not in payload:
        raise UnauthorizedError("Invalid authentication token.")
    return payload


def blacklist_token(token):
    """Store a valid token until its expiry so logout is enforced server-side."""
    payload = decode_access_token(token, check_blacklist=False)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    get_db().token_blacklist.update_one(
        {"token": token},
        {
            "$set": {
                "token": token,
                "expiresAt": expires_at,
                "blacklistedAt": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
