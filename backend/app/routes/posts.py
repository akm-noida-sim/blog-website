"""Blog post CRUD, discovery and filtering endpoints."""

from bson import ObjectId
from flask import Blueprint, g, jsonify, request
from pymongo import ASCENDING, DESCENDING

from ..database import get_db
from ..decorators import can_modify, optional_auth, require_auth
from ..errors import ForbiddenError, NotFoundError, ValidationError
from ..serializers import post_out
from ..utils import (
    clean_text,
    json_body,
    pagination_meta,
    pagination_params,
    regex_query,
    require_fields,
    sanitize_list,
    strip_markdown,
    unique_slug,
    utcnow,
)

bp = Blueprint("posts", __name__, url_prefix="/api/posts")

VALID_STATUS = {"draft", "published"}


def find_post(db, post_id):
    """Find a post by its Mongo id or by its human-readable slug."""
    post = None
    if ObjectId.is_valid(str(post_id)):
        post = db.posts.find_one({"_id": ObjectId(str(post_id))})
    if post is None:
        post = db.posts.find_one({"slug": str(post_id).lower()})
    if post is None:
        raise NotFoundError("Post not found.")
    return post


def ensure_visible(post, viewer):
    if post.get("status") != "published" and not can_modify(viewer, post["author"]):
        raise NotFoundError("Post not found.")


def validate_post_fields(data, partial=False):
    """Validate and normalise the writable post fields."""
    details = {}
    updates = {}

    if not partial or "title" in data:
        title = clean_text(data.get("title"), 150)
        if len(title) < 3:
            details["title"] = "Title must be at least 3 characters long."
        updates["title"] = title

    if not partial or "content" in data:
        content = str(data.get("content") or "")
        if len(content.strip()) < 20:
            details["content"] = "Content must be at least 20 characters long."
        updates["content"] = content

    if "excerpt" in data:
        updates["excerpt"] = clean_text(data.get("excerpt"), 300)
    elif not partial:
        updates["excerpt"] = strip_markdown(updates.get("content", ""), 180)

    if not partial or "status" in data:
        status = clean_text(data.get("status")) or "published"
        if status not in VALID_STATUS:
            details["status"] = "Status must be 'draft' or 'published'."
        updates["status"] = status

    if "categories" in data or not partial:
        updates["categories"] = sanitize_list(data.get("categories"), max_items=5, max_length=40)
    if "tags" in data or not partial:
        updates["tags"] = sanitize_list(data.get("tags"), max_items=10, max_length=30)

    if "featuredImage" in data or not partial:
        updates["featuredImage"] = clean_text(data.get("featuredImage"), 500)
    if "featured" in data or not partial:
        updates["featured"] = bool(data.get("featured", False))

    if details:
        raise ValidationError("Please correct the highlighted fields.", details=details)
    return updates


@bp.get("")
@optional_auth
def list_posts():
    db = get_db()
    query = {"status": "published"}
    args = request.args

    search = clean_text(args.get("search"), 100)
    if search:
        query["$or"] = [
            {"title": regex_query(search)},
            {"excerpt": regex_query(search)},
            {"content": regex_query(search)},
            {"tags": regex_query(search)},
            {"categories": regex_query(search)},
        ]
    if clean_text(args.get("category")):
        query["categories"] = regex_query(clean_text(args.get("category"), 40))
    if clean_text(args.get("tag")):
        query["tags"] = regex_query(clean_text(args.get("tag"), 30))
    if args.get("author"):
        try:
            query["author"] = ObjectId(args["author"])
        except (TypeError, ValueError):
            query["_id"] = {"$exists": False}

    sort_by = args.get("sort", "latest")
    if sort_by == "popular":
        sort_spec = [("views", DESCENDING), ("likeCount", DESCENDING)]
    elif sort_by == "oldest":
        sort_spec = [("publishedAt", ASCENDING)]
    else:
        sort_spec = [("publishedAt", DESCENDING), ("createdAt", DESCENDING)]

    page, limit = pagination_params()
    total = db.posts.count_documents(query)
    cursor = (
        db.posts.find(query)
        .sort(sort_spec)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return jsonify(
        {
            "posts": [post_out(db, post, g.current_user) for post in cursor],
            "pagination": pagination_meta(page, limit, total),
        }
    )


@bp.get("/featured")
@optional_auth
def featured_posts():
    db = get_db()
    try:
        limit = max(1, min(int(request.args.get("limit", 3)), 6))
    except (TypeError, ValueError):
        limit = 3
    cursor = (
        db.posts.find({"status": "published", "featured": True})
        .sort("publishedAt", DESCENDING)
        .limit(limit)
    )
    return jsonify({"posts": [post_out(db, post, g.current_user) for post in cursor]})


@bp.get("/mine")
@require_auth
def my_posts():
    db = get_db()
    query = {"author": g.current_user["_id"]}
    status = request.args.get("status")
    if status in VALID_STATUS:
        query["status"] = status

    page, limit = pagination_params()
    total = db.posts.count_documents(query)
    cursor = (
        db.posts.find(query)
        .sort("createdAt", DESCENDING)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return jsonify(
        {
            "posts": [post_out(db, post, g.current_user) for post in cursor],
            "pagination": pagination_meta(page, limit, total),
        }
    )


@bp.get("/<post_id>")
@optional_auth
def get_post(post_id):
    db = get_db()
    post = find_post(db, post_id)
    ensure_visible(post, g.current_user)
    db.posts.update_one({"_id": post["_id"]}, {"$inc": {"views": 1}})
    post["views"] = int(post.get("views", 0)) + 1
    return jsonify({"post": post_out(db, post, g.current_user, include_content=True)})


@bp.post("")
@require_auth
def create_post():
    db = get_db()
    data = json_body()
    require_fields(data, ("title", "content"))
    updates = validate_post_fields(data)
    now = utcnow()

    post = {
        **updates,
        "slug": unique_slug(db, updates["title"]),
        "author": g.current_user["_id"],
        "authorInfo": {
            "id": str(g.current_user["_id"]),
            "name": g.current_user.get("name", ""),
            "avatar": g.current_user.get("avatar", ""),
        },
        "views": 0,
        "likeCount": 0,
        "commentCount": 0,
        "publishedAt": now if updates["status"] == "published" else None,
        "createdAt": now,
        "updatedAt": now,
    }
    post["_id"] = db.posts.insert_one(post).inserted_id
    return (
        jsonify({"message": "Post created successfully.", "post": post_out(db, post, g.current_user, True)}),
        201,
    )


@bp.put("/<post_id>")
@require_auth
def update_post(post_id):
    db = get_db()
    post = find_post(db, post_id)
    if not can_modify(g.current_user, post["author"]):
        raise ForbiddenError("You can only edit your own posts.")

    data = json_body()
    if not data:
        raise ValidationError("No fields to update.")
    updates = validate_post_fields(data, partial=True)

    if "slug" in data:
        custom_slug = clean_text(data.get("slug"), 90).lower()
        if custom_slug:
            collision = db.posts.find_one({"slug": custom_slug, "_id": {"$ne": post["_id"]}})
            if collision:
                raise ValidationError("That URL slug is already taken.", details={"slug": "Already taken."})
            updates["slug"] = custom_slug

    if updates.get("status") == "published" and not post.get("publishedAt"):
        updates["publishedAt"] = utcnow()
    updates["updatedAt"] = utcnow()

    db.posts.update_one({"_id": post["_id"]}, {"$set": updates})
    updated = db.posts.find_one({"_id": post["_id"]})
    return jsonify(
        {"message": "Post updated successfully.", "post": post_out(db, updated, g.current_user, True)}
    )


@bp.delete("/<post_id>")
@require_auth
def delete_post(post_id):
    db = get_db()
    post = find_post(db, post_id)
    if not can_modify(g.current_user, post["author"]):
        raise ForbiddenError("You can only delete your own posts.")

    db.comments.delete_many({"postId": post["_id"]})
    db.likes.delete_many({"postId": post["_id"]})
    db.posts.delete_one({"_id": post["_id"]})
    return jsonify({"message": "Post deleted successfully."})
