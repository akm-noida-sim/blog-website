"""Blueprint exports for the API."""

from . import admin, auth, comments, health, likes, posts, uploads, users

blueprints = (
    auth.bp,
    users.bp,
    posts.bp,
    comments.bp,
    likes.bp,
    uploads.bp,
    admin.bp,
    health.bp,
)

__all__ = ["blueprints"]
