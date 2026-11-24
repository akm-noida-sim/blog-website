"""Authentication and authorization decorators for protected routes."""

from functools import wraps

from bson import ObjectId
from flask import g, request

from .database import get_db
from .errors import ForbiddenError, UnauthorizedError
from .security import decode_access_token


def get_current_user(optional=False):
    header = request.headers.get("Authorization", "")
    parts = header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        if optional:
            return None
        raise UnauthorizedError("Authentication is required to access this resource.")

    payload = decode_access_token(parts[1])
    try:
        user_id = ObjectId(payload["sub"])
    except (TypeError, ValueError):
        raise UnauthorizedError("Invalid authentication token.")

    user = get_db().users.find_one({"_id": user_id})
    if not user:
        raise UnauthorizedError("This account no longer exists. Please log in again.")
    return user


def require_auth(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        g.current_user = get_current_user()
        return view(*args, **kwargs)

    return wrapper


def optional_auth(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        g.current_user = get_current_user(optional=True)
        return view(*args, **kwargs)

    return wrapper


def require_admin(view):
    @wraps(view)
    @require_auth
    def wrapper(*args, **kwargs):
        if g.current_user.get("role") != "admin":
            raise ForbiddenError("Administrator access is required.")
        return view(*args, **kwargs)

    return wrapper


def is_admin(user):
    return bool(user and user.get("role") == "admin")


def can_modify(user, resource_owner_id):
    """Authors may modify their own content; admins may modify anything."""
    if user is None:
        return False
    return is_admin(user) or str(user["_id"]) == str(resource_owner_id)
