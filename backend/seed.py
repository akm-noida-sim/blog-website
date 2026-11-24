"""Optional demo seed: writes *real* records through the app's MongoDB models.

Usage:  python seed.py
Set SEED_PASSWORD in .env to choose the password (default: DemoPassword123).
Re-running is safe: existing emails are left untouched.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402
from app.database import get_db  # noqa: E402
from app.security import hash_password  # noqa: E402
from app.utils import strip_markdown, unique_slug, utcnow  # noqa: E402

app = create_app()
SEED_PASSWORD = os.getenv("SEED_PASSWORD", "DemoPassword123")

ARTICLES = [
    {
        "title": "Designing a REST API with Flask and MongoDB",
        "category": "Backend",
        "tags": ["flask", "mongodb", "api"],
        "content": """# Designing a REST API with Flask and MongoDB

A great API is predictable, resource-oriented and boring in the best possible way.
Flask gives us the flexibility; MongoDB gives us a schema we can evolve.

## Start with resources, not routes

Think in nouns: `users`, `posts`, `comments`, `likes`. Verbs belong to HTTP methods.

```python
@bp.get("/posts")
def list_posts():
    posts = db.posts.find({"status": "published"})
    return jsonify({"posts": [serialize(post) for post in posts]})
```

## Validate at the boundary

Never trust a request body. Validate types, lengths and allowed values before a
single write reaches the database. Return a consistent error shape so clients
can render one error component for the whole application.

## Index what you filter on

An index on `(status, publishedAt)` keeps the homepage fast even with thousands
of posts. A unique index on `(postId, user)` makes likes idempotent per user.

> Good APIs are not an accident. They are the result of small, boring decisions
> made consistently.
""",
    },
    {
        "title": "Why React Context Still Matters in 2026",
        "category": "Frontend",
        "tags": ["react", "javascript", "architecture"],
        "content": """# Why React Context Still Matters in 2026

Server state and client state are different problems. React Context is still an
excellent tool for the second one: theme, session and UI notifications.

## The right granularity

Keep contexts small. An `AuthContext` that only handles the current session is
far easier to reason about than a giant store holding every piece of UI state.

## Pair it with a good data layer

Fetching belongs in a dedicated API client with interceptors for auth headers
and error normalisation. Context should consume that client, not replace it.

```jsx
const { user, login, logout } = useAuth();
```

When the state is truly cross-cutting and changes infrequently, context remains
the simplest dependency-free answer.
""",
    },
    {
        "title": "A Practical Guide to JWT Authentication",
        "category": "Security",
        "tags": ["jwt", "security", "authentication"],
        "content": """# A Practical Guide to JWT Authentication

A JWT is a signed statement about a session. It is not encryption, and it is not
magic. Treat it as a bearer credential.

## Hash passwords with bcrypt

Always store a salted hash, never the password itself. Bcrypt handles the salt
for you and is deliberately slow to resist brute-force attacks.

## Keep secrets out of source control

The signing secret comes from an environment variable. Rotating it invalidates
all existing tokens, which is exactly what you want after a leak.

## Revoke on logout

Store the token in a blacklist collection with a TTL matching its expiry. That
way a logged-out token cannot be reused until it naturally expires.

Security is a chain. Hashing, HTTPS, validation and short-lived tokens all matter.
""",
    },
]


def ensure_user(db, email, name, role, password):
    existing = db.users.find_one({"email": email})
    if existing:
        return existing
    now = utcnow()
    user = {
        "name": name,
        "email": email,
        "passwordHash": hash_password(password),
        "role": role,
        "bio": "Writing about software, design and the craft of building things.",
        "avatar": "",
        "website": "",
        "createdAt": now,
        "updatedAt": now,
    }
    user["_id"] = db.users.insert_one(user).inserted_id
    return user


def main():
    with app.app_context():
        db = get_db()
        admin = ensure_user(db, "admin@blogsphere.local", "BlogSphere Admin", "admin", SEED_PASSWORD)
        author = ensure_user(db, "author@blogsphere.local", "Alex Morgan", "user", SEED_PASSWORD)

        for index, article in enumerate(ARTICLES):
            if db.posts.find_one({"title": article["title"]}):
                continue
            now = utcnow() - timedelta(days=index * 2)
            post = {
                "title": article["title"],
                "slug": unique_slug(db, article["title"]),
                "content": article["content"],
                "excerpt": strip_markdown(article["content"], 180),
                "featuredImage": "",
                "categories": [article["category"]],
                "tags": article["tags"],
                "status": "published",
                "featured": index == 0,
                "views": 40 + index * 17,
                "likeCount": 0,
                "commentCount": 0,
                "author": author["_id"],
                "authorInfo": {"id": str(author["_id"]), "name": author["name"], "avatar": ""},
                "publishedAt": now,
                "createdAt": now,
                "updatedAt": now,
            }
            post["_id"] = db.posts.insert_one(post).inserted_id

            comment = {
                "postId": post["_id"],
                "parentId": None,
                "content": "This was a genuinely useful read. Thanks for sharing!",
                "author": admin["_id"],
                "authorInfo": {"id": str(admin["_id"]), "name": admin["name"], "avatar": ""},
                "createdAt": now,
                "updatedAt": now,
            }
            db.comments.insert_one(comment)
            db.posts.update_one({"_id": post["_id"]}, {"$inc": {"commentCount": 1}})

        print(
            "Seed complete. Demo accounts:\n"
            f"  admin@blogsphere.local / {SEED_PASSWORD} (admin)\n"
            f"  author@blogsphere.local / {SEED_PASSWORD} (author)"
        )


if __name__ == "__main__":
    main()
