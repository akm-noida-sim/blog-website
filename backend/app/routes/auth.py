"""Authentication and account management endpoints."""

from flask import Blueprint, current_app, g, jsonify, request

from ..database import get_db
from ..decorators import require_auth
from ..errors import ConflictError, ValidationError
from ..security import (
    blacklist_token,
    create_access_token,
    hash_password,
    verify_password,
)
from ..serializers import user_public
from ..utils import (
    clean_text,
    is_valid_email,
    json_body,
    normalize_email,
    require_fields,
    utcnow,
    validate_password,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    data = json_body()
    require_fields(data, ("name", "email", "password"))

    name = clean_text(data.get("name"), 60)
    email = normalize_email(data.get("email"))
    password = str(data.get("password") or "")
    details = {}
    if len(name) < 2:
        details["name"] = "Name must be at least 2 characters long."
    if not is_valid_email(email):
        details["email"] = "Please enter a valid email address."
    password_error = validate_password(password)
    if password_error:
        details["password"] = password_error
    if details:
        raise ValidationError("Please correct the highlighted fields.", details=details)

    db = get_db()
    if db.users.find_one({"email": email}, {"_id": 1}):
        raise ConflictError("An account with this email already exists.")

    role = "admin" if email in current_app.config["ADMIN_EMAILS"] else "user"
    now = utcnow()
    user = {
        "name": name,
        "email": email,
        "passwordHash": hash_password(password),
        "role": role,
        "bio": "",
        "avatar": "",
        "website": "",
        "createdAt": now,
        "updatedAt": now,
    }
    user["_id"] = db.users.insert_one(user).inserted_id
    token = create_access_token(user["_id"])
    return (
        jsonify(
            {
                "message": "Account created successfully.",
                "user": user_public(user, include_email=True),
                "token": token,
            }
        ),
        201,
    )


@bp.post("/login")
def login():
    data = json_body()
    require_fields(data, ("email", "password"))
    db = get_db()
    user = db.users.find_one({"email": normalize_email(data.get("email"))})
    if not user or not verify_password(str(data.get("password") or ""), user.get("passwordHash", "")):
        raise ValidationError(
            "Incorrect email or password.", details={"credentials": "Incorrect email or password."}
        )

    token = create_access_token(user["_id"])
    return jsonify(
        {
            "message": "Logged in successfully.",
            "user": user_public(user, include_email=True),
            "token": token,
        }
    )


@bp.post("/logout")
@require_auth
def logout():
    blacklist_token(request.headers["Authorization"].split()[1])
    return jsonify({"message": "Logged out successfully."})


@bp.get("/me")
@require_auth
def me():
    return jsonify({"user": user_public(g.current_user, include_email=True)})


@bp.put("/profile")
@require_auth
def update_profile():
    data = json_body()
    allowed = ("name", "bio", "avatar", "website")
    updates = {}
    for field in allowed:
        if field in data:
            updates[field] = clean_text(data.get(field), 500 if field != "name" else 60)

    if "name" in updates and len(updates["name"]) < 2:
        raise ValidationError("Name must be at least 2 characters long.", details={"name": "Too short."})

    if not updates:
        raise ValidationError("No profile fields were provided.")

    updates["updatedAt"] = utcnow()
    db = get_db()
    db.users.update_one({"_id": g.current_user["_id"]}, {"$set": updates})
    user = db.users.find_one({"_id": g.current_user["_id"]})
    return jsonify({"message": "Profile updated successfully.", "user": user_public(user, include_email=True)})


@bp.put("/password")
@require_auth
def change_password():
    data = json_body()
    require_fields(data, ("currentPassword", "newPassword"))
    if not verify_password(str(data["currentPassword"]), g.current_user.get("passwordHash", "")):
        raise ValidationError(
            "Current password is incorrect.", details={"currentPassword": "Incorrect password."}
        )
    error = validate_password(str(data["newPassword"]))
    if error:
        raise ValidationError("Please correct the highlighted fields.", details={"newPassword": error})

    get_db().users.update_one(
        {"_id": g.current_user["_id"]},
        {"$set": {"passwordHash": hash_password(str(data["newPassword"])), "updatedAt": utcnow()}},
    )
    return jsonify({"message": "Password updated successfully."})
