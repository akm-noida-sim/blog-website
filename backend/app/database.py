"""PyMongo connection management, collection helpers and index setup."""

from flask import current_app, g
from pymongo import ASCENDING, DESCENDING, MongoClient, TEXT


def get_client():
    """Return a process-wide MongoClient, created lazily for the active app."""
    if not hasattr(current_app, "mongo_client"):
        current_app.mongo_client = MongoClient(
            current_app.config["MONGO_URI"], serverSelectionTimeoutMS=5000
        )
    return current_app.mongo_client


def get_db():
    """Return the database for the current request, stored on Flask's g."""
    if "db" not in g:
        g.db = get_client()[current_app.config["DB_NAME"]]
    return g.db


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        # Connections are pooled on the client and returned to the pool here.
        pass


def init_app(app):
    app.teardown_appcontext(close_db)


def init_indexes(app):
    """Create indexes once at startup; safe to call repeatedly."""
    with app.app_context():
        db = get_db()
        db.users.create_index("email", unique=True)
        db.posts.create_index("slug", unique=True)
        db.posts.create_index([("status", ASCENDING), ("publishedAt", DESCENDING)])
        db.posts.create_index([("author", ASCENDING), ("createdAt", DESCENDING)])
        db.posts.create_index([("title", TEXT), ("content", TEXT), ("tags", TEXT)])
        db.comments.create_index([("postId", ASCENDING), ("createdAt", ASCENDING)])
        db.comments.create_index("parentId")
        db.likes.create_index([("postId", ASCENDING), ("user", ASCENDING)], unique=True)
        db.token_blacklist.create_index("expiresAt", expireAfterSeconds=0)
