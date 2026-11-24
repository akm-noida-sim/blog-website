"""Public user profiles."""

from flask import Blueprint, g, jsonify, request

from ..database import get_db
from ..decorators import optional_auth
from ..errors import NotFoundError
from ..serializers import post_out, user_public
from ..utils import pagination_meta, pagination_params, parse_object_id

bp = Blueprint("users", __name__, url_prefix="/api/users")


@bp.get("/<user_id>")
def profile(user_id):
    db = get_db()
    user = db.users.find_one({"_id": parse_object_id(user_id)})
    if not user:
        raise NotFoundError("User not found.")
    data = user_public(user)
    data["postsCount"] = db.posts.count_documents({"author": user["_id"], "status": "published"})
    return jsonify({"user": data})


@bp.get("/<user_id>/posts")
@optional_auth
def user_posts(user_id):
    db = get_db()
    author_id = parse_object_id(user_id)
    if not db.users.find_one({"_id": author_id}, {"_id": 1}):
        raise NotFoundError("User not found.")

    page, limit = pagination_params()
    query = {"author": author_id, "status": "published"}
    total = db.posts.count_documents(query)
    cursor = (
        db.posts.find(query)
        .sort("publishedAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return jsonify(
        {
            "posts": [post_out(db, post, g.current_user) for post in cursor],
            "pagination": pagination_meta(page, limit, total),
        }
    )
