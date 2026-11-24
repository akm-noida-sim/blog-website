"""Convert MongoDB documents into stable, public-facing JSON objects."""

from .utils import iso


def user_public(user, include_email=False):
    data = {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "bio": user.get("bio", ""),
        "avatar": user.get("avatar", ""),
        "website": user.get("website", ""),
        "createdAt": iso(user.get("createdAt")),
    }
    if include_email:
        data["email"] = user.get("email", "")
    return data


def author_brief(db, author_id, embedded=None):
    user = None
    if author_id is not None:
        user = db.users.find_one({"_id": author_id}, {"name": 1, "avatar": 1})
    if user:
        return {"id": str(user["_id"]), "name": user.get("name", ""), "avatar": user.get("avatar", "")}
    embedded = embedded or {}
    return {
        "id": str(embedded.get("id") or author_id or ""),
        "name": embedded.get("name", "Unknown author"),
        "avatar": embedded.get("avatar", ""),
    }


def post_out(db, post, viewer=None, include_content=False):
    author_id = post.get("author")
    liked = False
    if viewer is not None:
        liked = bool(
            db.likes.find_one({"postId": post["_id"], "user": viewer["_id"]}, {"_id": 1})
        )

    data = {
        "id": str(post["_id"]),
        "title": post.get("title", ""),
        "slug": post.get("slug", ""),
        "excerpt": post.get("excerpt", ""),
        "featuredImage": post.get("featuredImage", ""),
        "categories": post.get("categories", []),
        "tags": post.get("tags", []),
        "status": post.get("status", "published"),
        "featured": bool(post.get("featured", False)),
        "views": int(post.get("views", 0)),
        "likeCount": int(post.get("likeCount", 0)),
        "commentCount": int(post.get("commentCount", 0)),
        "likedByMe": liked,
        "author": author_brief(db, author_id, post.get("authorInfo")),
        "createdAt": iso(post.get("createdAt")),
        "updatedAt": iso(post.get("updatedAt")),
        "publishedAt": iso(post.get("publishedAt")),
    }
    if include_content:
        data["content"] = post.get("content", "")
    return data


def comment_out(db, comment):
    return {
        "id": str(comment["_id"]),
        "postId": str(comment.get("postId", "")),
        "parentId": str(comment["parentId"]) if comment.get("parentId") else None,
        "content": comment.get("content", ""),
        "author": author_brief(db, comment.get("author"), comment.get("authorInfo")),
        "createdAt": iso(comment.get("createdAt")),
        "updatedAt": iso(comment.get("updatedAt")),
        "replies": [],
    }


def comment_tree(db, comments):
    nodes = {}
    roots = []
    for comment in comments:
        nodes[str(comment["_id"])] = comment_out(db, comment)
    for comment in comments:
        node = nodes[str(comment["_id"])]
        parent_id = str(comment["parentId"]) if comment.get("parentId") else None
        parent = nodes.get(parent_id) if parent_id else None
        if parent is not None:
            parent["replies"].append(node)
        else:
            roots.append(node)
    return roots
