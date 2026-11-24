"""Like/unlike endpoints backed by a unique (post, user) index."""

from bson import ObjectId
from flask import Blueprint, g, jsonify

from ..database import get_db
from ..decorators import optional_auth, require_auth
from ..errors import NotFoundError

bp = Blueprint("likes", __name__, url_prefix="/api/likes")


def get_post(db, post_id):
    if not ObjectId.is_valid(str(post_id)):
        raise NotFoundError("Post not found.")
    post = db.posts.find_one({"_id": ObjectId(str(post_id)), "status": "published"})
    if not post:
        raise NotFoundError("Post not found.")
    return post


def like_state(db, post, user):
    liked = bool(user and db.likes.find_one({"postId": post["_id"], "user": user["_id"]}, {"_id": 1}))
    return liked, int(post.get("likeCount", 0))


@bp.get("/<post_id>")
@optional_auth
def like_status(post_id):
    db = get_db()
    post = get_post(db, post_id)
    liked, count = like_state(db, post, g.current_user)
    return jsonify({"liked": liked, "likeCount": count})


@bp.post("/<post_id>")
@require_auth
def toggle_like(post_id):
    db = get_db()
    post = get_post(db, post_id)
    liked, count = like_state(db, post, g.current_user)

    if liked:
        db.likes.delete_one({"postId": post["_id"], "user": g.current_user["_id"]})
        db.posts.update_one({"_id": post["_id"]}, {"$inc": {"likeCount": -1}})
        liked, count = False, max(0, count - 1)
        message = "Like removed."
    else:
        db.likes.insert_one(
            {"postId": post["_id"], "user": g.current_user["_id"]}
        )
        db.posts.update_one({"_id": post["_id"]}, {"$inc": {"likeCount": 1}})
        liked, count = True, count + 1
        message = "Post liked."

    return jsonify({"message": message, "liked": liked, "likeCount": count})
