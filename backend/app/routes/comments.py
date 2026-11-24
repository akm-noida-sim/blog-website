"""Nested comment threads with owner-only editing and deletion."""

from bson import ObjectId
from flask import Blueprint, g, jsonify

from ..database import get_db
from ..decorators import can_modify, optional_auth, require_auth
from ..errors import ForbiddenError, NotFoundError, ValidationError
from ..serializers import comment_out, comment_tree
from ..utils import clean_text, json_body, require_fields, utcnow

bp = Blueprint("comments", __name__, url_prefix="/api")


def visible_post(db, post_id, viewer):
    if not ObjectId.is_valid(str(post_id)):
        raise NotFoundError("Post not found.")
    post = db.posts.find_one({"_id": ObjectId(str(post_id))})
    if not post or (post.get("status") != "published" and not can_modify(viewer, post["author"])):
        raise NotFoundError("Post not found.")
    return post


@bp.get("/posts/<post_id>/comments")
@optional_auth
def list_comments(post_id):
    db = get_db()
    visible_post(db, post_id, g.current_user)
    comments = list(db.comments.find({"postId": ObjectId(str(post_id))}).sort("createdAt", 1))
    return jsonify(
        {
            "comments": comment_tree(db, comments),
            "count": len(comments),
        }
    )


@bp.post("/posts/<post_id>/comments")
@require_auth
def add_comment(post_id):
    db = get_db()
    post = visible_post(db, post_id, g.current_user)
    data = json_body()
    require_fields(data, ("content",))
    content = clean_text(data.get("content"), 1000)
    if not content:
        raise ValidationError("Comment cannot be empty.", details={"content": "This field is required."})

    parent_id = None
    if data.get("parentId"):
        if not ObjectId.is_valid(str(data["parentId"])):
            raise ValidationError("Invalid parent comment.")
        parent = db.comments.find_one({"_id": ObjectId(str(data["parentId"]))})
        if not parent or str(parent["postId"]) != str(post["_id"]):
            raise ValidationError("The comment you are replying to does not exist on this post.")
        parent_id = parent["_id"]

    now = utcnow()
    comment = {
        "postId": post["_id"],
        "parentId": parent_id,
        "content": content,
        "author": g.current_user["_id"],
        "authorInfo": {
            "id": str(g.current_user["_id"]),
            "name": g.current_user.get("name", ""),
            "avatar": g.current_user.get("avatar", ""),
        },
        "createdAt": now,
        "updatedAt": now,
    }
    comment["_id"] = db.comments.insert_one(comment).inserted_id
    db.posts.update_one({"_id": post["_id"]}, {"$inc": {"commentCount": 1}})
    return (
        jsonify({"message": "Comment added successfully.", "comment": comment_out(db, comment)}),
        201,
    )


@bp.put("/comments/<comment_id>")
@require_auth
def edit_comment(comment_id):
    db = get_db()
    if not ObjectId.is_valid(str(comment_id)):
        raise NotFoundError("Comment not found.")
    comment = db.comments.find_one({"_id": ObjectId(str(comment_id))})
    if not comment:
        raise NotFoundError("Comment not found.")
    if not can_modify(g.current_user, comment["author"]):
        raise ForbiddenError("You can only edit your own comments.")

    data = json_body()
    require_fields(data, ("content",))
    content = clean_text(data.get("content"), 1000)
    if not content:
        raise ValidationError("Comment cannot be empty.", details={"content": "This field is required."})

    db.comments.update_one(
        {"_id": comment["_id"]}, {"$set": {"content": content, "updatedAt": utcnow()}}
    )
    updated = db.comments.find_one({"_id": comment["_id"]})
    return jsonify(
        {"message": "Comment updated successfully.", "comment": comment_out(db, updated)}
    )


@bp.delete("/comments/<comment_id>")
@require_auth
def delete_comment(comment_id):
    db = get_db()
    if not ObjectId.is_valid(str(comment_id)):
        raise NotFoundError("Comment not found.")
    comment = db.comments.find_one({"_id": ObjectId(str(comment_id))})
    if not comment:
        raise NotFoundError("Comment not found.")
    if not can_modify(g.current_user, comment["author"]):
        raise ForbiddenError("You can only delete your own comments.")

    # Remove the comment together with every nested reply.
    to_delete = [comment["_id"]]
    frontier = [comment["_id"]]
    while frontier:
        children = list(db.comments.find({"parentId": {"$in": frontier}}, {"_id": 1}))
        frontier = [child["_id"] for child in children]
        to_delete.extend(frontier)

    db.comments.delete_many({"_id": {"$in": to_delete}})
    db.posts.update_one(
        {"_id": comment["postId"]}, {"$inc": {"commentCount": -len(to_delete)}}
    )
    return jsonify({"message": "Comment and its replies were deleted."})
