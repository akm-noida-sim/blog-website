"""Administrator endpoints for users, content and platform statistics."""

from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from ..database import get_db
from ..decorators import get_current_user, is_admin, require_admin
from ..errors import ForbiddenError, NotFoundError, ValidationError
from ..serializers import post_out, user_public
from ..utils import pagination_meta, pagination_params

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.before_request
def admin_only():
    g.current_user = get_current_user()
    if not is_admin(g.current_user):
        raise ForbiddenError("Administrator access is required.")


@bp.get("/stats")
def stats():
    db = get_db()
    totals = list(
        db.posts.aggregate(
            [
                {
                    "$group": {
                        "_id": None,
                        "views": {"$sum": "$views"},
                        "likes": {"$sum": "$likeCount"},
                        "comments": {"$sum": "$commentCount"},
                    }
                }
            ]
        )
    )
    totals = totals[0] if totals else {}
    return jsonify(
        {
            "stats": {
                "users": db.users.count_documents({}),
                "posts": db.posts.count_documents({}),
                "publishedPosts": db.posts.count_documents({"status": "published"}),
                "drafts": db.posts.count_documents({"status": "draft"}),
                "comments": db.comments.count_documents({}),
                "likes": db.likes.count_documents({}),
                "views": int(totals.get("views", 0)),
                "engagement": int(totals.get("likes", 0)) + int(totals.get("comments", 0)),
            }
        }
    )


@bp.get("/users")
def users():
    db = get_db()
    page, limit = pagination_params()
    total = db.users.count_documents({})
    cursor = (
        db.users.find({}, {"passwordHash": 0})
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return jsonify(
        {
            "users": [user_public(user, include_email=True) for user in cursor],
            "pagination": pagination_meta(page, limit, total),
        }
    )


@bp.put("/users/<user_id>/role")
def change_role(user_id):
    db = get_db()
    if not ObjectId.is_valid(str(user_id)):
        raise NotFoundError("User not found.")
    if str(user_id) == str(g.current_user["_id"]):
        raise ForbiddenError("You cannot change your own role.")
    role = (request.get_json(silent=True) or {}).get("role")
    if role not in ("user", "admin"):
        raise ValidationError("Role must be 'user' or 'admin'.", details={"role": "Invalid role."})
    user = db.users.find_one({"_id": ObjectId(str(user_id))})
    if not user:
        raise NotFoundError("User not found.")
    db.users.update_one({"_id": user["_id"]}, {"$set": {"role": role}})
    updated = db.users.find_one({"_id": user["_id"]})
    return jsonify({"message": "User role updated.", "user": user_public(updated, include_email=True)})


@bp.delete("/users/<user_id>")
def delete_user(user_id):
    db = get_db()
    if not ObjectId.is_valid(str(user_id)):
        raise NotFoundError("User not found.")
    if str(user_id) == str(g.current_user["_id"]):
        raise ForbiddenError("You cannot delete your own account.")
    target = db.users.find_one({"_id": ObjectId(str(user_id))})
    if not target:
        raise NotFoundError("User not found.")

    post_ids = [post["_id"] for post in db.posts.find({"author": target["_id"]}, {"_id": 1})]
    comment_ids = [
        c["_id"]
        for c in db.comments.find(
            {"$or": [{"postId": {"$in": post_ids}}, {"author": target["_id"]}]}, {"_id": 1}
        )
    ]
    like_ids = [
        like["_id"]
        for like in db.likes.find(
            {"$or": [{"postId": {"$in": post_ids}}, {"user": target["_id"]}]}, {"_id": 1}
        )
    ]
    if comment_ids:
        db.comments.delete_many({"_id": {"$in": comment_ids}})
    if like_ids:
        db.likes.delete_many({"_id": {"$in": like_ids}})
    for post_id in post_ids:
        db.posts.update_one({"_id": post_id}, {"$set": {"likeCount": 0, "commentCount": 0}})
    db.posts.delete_many({"_id": {"$in": post_ids}})
    db.users.delete_one({"_id": target["_id"]})
    return jsonify({"message": "User and their content were deleted."})


@bp.get("/posts")
def posts():
    db = get_db()
    page, limit = pagination_params()
    total = db.posts.count_documents({})
    cursor = (
        db.posts.find({})
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return jsonify(
        {
            "posts": [post_out(db, post, g.current_user) for post in cursor],
            "pagination": pagination_meta(page, limit, total),
        }
    )


@bp.delete("/posts/<post_id>")
def delete_post(post_id):
    db = get_db()
    if not ObjectId.is_valid(str(post_id)):
        raise NotFoundError("Post not found.")
    post = db.posts.find_one({"_id": ObjectId(str(post_id))})
    if not post:
        raise NotFoundError("Post not found.")
    db.comments.delete_many({"postId": post["_id"]})
    db.likes.delete_many({"postId": post["_id"]})
    db.posts.delete_one({"_id": post["_id"]})
    return jsonify({"message": "Post deleted successfully."})
