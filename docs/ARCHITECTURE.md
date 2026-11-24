# BlogSphere Architecture

## Overview

BlogSphere is a two-tier client/server application.

```
Browser (React SPA, Vercel or Vite dev server)
        │  HTTPS / JSON + Bearer JWT
        ▼
Flask REST API (Render or local, gunicorn in production)
        │  PyMongo
        ▼
MongoDB (Atlas or local mongod)
        │
        └── uploads/ (featured images served by Flask at /uploads)
```

The frontend never touches MongoDB. All state changes go through REST endpoints that validate input and enforce authorization.

---

## Backend layers

| Layer | Responsibility | Key files |
| --- | --- | --- |
| App factory | Config, CORS, blueprints, error handlers, index setup, upload serving | `app/__init__.py`, `app/config.py` |
| Data access | Request-scoped PyMongo handle via Flask `g`, index creation | `app/database.py` |
| Security | bcrypt hashing, JWT issue/verify, blacklist | `app/security.py` |
| Authorization | `@require_auth`, `@optional_auth`, `@require_admin`, `can_modify` | `app/decorators.py` |
| Validation | Field cleaning, length/type checks, pagination, slugs | `app/utils.py` |
| Presentation | BSON → JSON mappers, nested comment trees | `app/serializers.py` |
| Routes | Thin HTTP handlers delegating to the layers above | `app/routes/*.py` |
| Errors | Typed exceptions with uniform JSON responses | `app/errors.py` |

All configuration is read from environment variables (`MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `ADMIN_EMAILS`, etc.), so the same code runs locally and in production.

---

## Data model

Collections and their important fields:

### `users`
`_id`, `name`, `email` (unique), `passwordHash`, `role` (`user`/`admin`), `bio`, `avatar`, `website`, `createdAt`, `updatedAt`

### `posts`
`_id`, `title`, `slug` (unique), `content` (Markdown), `excerpt`, `featuredImage`, `categories[]`, `tags[]`, `status` (`draft`/`published`), `featured`, `views`, `likeCount`, `commentCount`, `author`, `authorInfo` (denormalised name/avatar), `publishedAt`, `createdAt`, `updatedAt`

Author information is denormalised at write time so list views need no extra query; serializers still join the live user document for up-to-date names and avatars.

### `comments`
`_id`, `postId`, `parentId` (nullable), `content`, `author`, `authorInfo`, `createdAt`, `updatedAt`

Threads are assembled in memory after one sorted query per post. Deleting a parent recursively collects descendants before deletion.

### `likes`
`_id`, `postId`, `user`, `createdAt` — unique compound index on `(postId, user)` makes one-like-per-user enforced by the database.

### `token_blacklist`
`token`, `expiresAt` (TTL index), `blacklistedAt` — logout revokes a JWT until its natural expiry.

### Indexes
- `users.email` unique
- `posts.slug` unique
- `posts(status, publishedAt)` for the homepage feed
- `posts(author, createdAt)` for dashboards
- text index on post title/content/tags
- `comments(postId, createdAt)`, `comments.parentId`
- `likes(postId, user)` unique
- `token_blacklist.expiresAt` TTL

Indexes are created idempotently on application startup in `database.init_indexes`.

---

## Request lifecycle example (create post)

1. Axios attaches `Authorization: Bearer <jwt>`.
2. `@require_auth` decodes the JWT, checks the blacklist and loads the user from MongoDB.
3. `validate_post_fields` cleans and validates title, content, status, categories, tags and flags.
4. `unique_slug` generates a collision-free slug.
5. The document is inserted with the author reference and counters initialised to zero.
6. `post_out` serialises BSON ids/dates to JSON; the API returns `201` with the created post.

Failures at any step raise a typed `AppError` and are rendered by the central error handler as `{ success: false, error: { code, message, details } }`.

---

## Frontend structure

```
src/
├── lib/api.js          # Axios instance, interceptors, media URL resolution
├── context/            # AuthContext, ThemeContext, ToastContext
├── components/         # Layout, Navbar, Footer, PostCard, CommentSection,
│                       # MarkdownEditor, Pagination, Spinner, Toast, ...
└── pages/              # Home, Explore, Article, Login, Register, Editor,
                        # Dashboard, Profile, Admin, NotFound
```

Design decisions:

- **Auth bootstrap**: on mount the app calls `/auth/me` if a token is stored, so a refresh keeps the session.
- **401 handling**: the Axios response interceptor clears the token and redirects to login, except on auth-form requests where the form must show the error.
- **Theme**: `class`-based dark mode in Tailwind, preference saved to `localStorage`.
- **Media**: uploaded image URLs are relative; `resolveMediaUrl` prefixes the API origin in production.
- **State**: React Context only for cross-cutting state (session, theme, notifications); server data is fetched per page with local loading/error state.

---

## Authorization matrix

| Action | Anonymous | User | Author of resource | Admin |
| --- | --- | --- | --- | --- |
| Read published posts/comments | ✅ | ✅ | ✅ | ✅ |
| Read draft | ❌ | ❌ | ✅ | ✅ |
| Create post/comment/like | ❌ | ✅ | ✅ | ✅ |
| Edit/delete own post/comment | ❌ | ✅ | ✅ | ✅ |
| Edit/delete someone else's content | ❌ | ❌ | ❌ | ✅ |
| Admin console | ❌ | ❌ | ❌ | ✅ |

Ownership is always checked against the document's `author` field on the server; hiding buttons in the UI is not the security boundary.

---

## Trade-offs and future work

- Uploads use the local filesystem, which is fine for a single Render web service but not shared across multiple instances. A production scale-out would swap this for S3/Cloudinary.
- Search uses case-insensitive regexes. At larger scale, a MongoDB Atlas Search index would be preferable.
- Counters are maintained with `$inc` on the post document; periodic reconciliation could guard against drift after partial failures.
- Refresh tokens could be added to shorten access-token lifetime without frequent re-login.
