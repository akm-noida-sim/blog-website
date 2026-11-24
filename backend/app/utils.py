"""Small validation, parsing and formatting helpers shared by the API."""

import math
import re
import uuid
from datetime import datetime, timezone
from re import escape

from bson import ObjectId

from .errors import NotFoundError, ValidationError


def utcnow():
    return datetime.now(timezone.utc)


def iso(value):
    if not value:
        return None
    return value.isoformat().replace("+00:00", "Z")


def serialize(value):
    """Recursively convert BSON values into JSON-friendly Python values."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return iso(value)
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize(item) for item in value]
    return value


def parse_object_id(value):
    if not ObjectId.is_valid(str(value)):
        raise NotFoundError("The requested resource was not found.")
    return ObjectId(str(value))


def clean_text(value, max_length=None):
    if value is None:
        return ""
    text = str(value).strip()
    if max_length:
        text = text[:max_length]
    return text


def normalize_email(value):
    return clean_text(value).lower()


def is_valid_email(value):
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]{2,}", value or ""))


def validate_password(value):
    """Return a human readable error, or None when the password is strong enough."""
    password = value or ""
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password):
        return "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return "Password must contain at least one number."
    if len(password) > 128:
        return "Password must be at most 128 characters long."
    return None


def require_fields(data, fields):
    """Collect missing-field errors instead of failing on the first one."""
    details = {}
    for field in fields:
        if data.get(field) is None or (isinstance(data.get(field), str) and not data[field].strip()):
            details[field] = "This field is required."
    if details:
        raise ValidationError("Please fill in all required fields.", details=details)


def sanitize_list(value, max_items=10, max_length=60):
    """Return a list of trimmed, de-duplicated, non-empty strings."""
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValidationError("Expected a list of values.", details={})
    result = []
    for item in value:
        text = clean_text(item, max_length)
        if text and text not in result:
            result.append(text)
    if len(result) > max_items:
        raise ValidationError(f"At most {max_items} values are allowed.", details={})
    return result


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug[:80] or "post"


def unique_slug(db, title):
    base = slugify(title)
    candidate = base
    while db.posts.find_one({"slug": candidate}, {"_id": 1}):
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
    return candidate


def regex_query(value):
    return {"$regex": escape(str(value)), "$options": "i"}


def json_body():
    """Return the request JSON object, or an empty dict for malformed bodies."""
    from flask import request

    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def pagination_params(default_limit=9, max_limit=50):
    from flask import request

    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        limit = int(request.args.get("limit", default_limit))
    except (TypeError, ValueError):
        limit = default_limit
    limit = max(1, min(limit, max_limit))
    return page, limit


def pagination_meta(page, limit, total):
    pages = math.ceil(total / limit) if total else 0
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "pages": pages,
        "hasNext": page < pages,
        "hasPrev": page > 1,
    }


def strip_markdown(text, limit=160):
    plain = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text or "")
    plain = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", plain)
    plain = re.sub(r"[`#>*_~\[\]]", "", plain)
    plain = re.sub(r"\s+", " ", plain).strip()
    return plain[:limit] + ("…" if len(plain) > limit else "")
