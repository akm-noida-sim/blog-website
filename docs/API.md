# BlogSphere REST API

Base URL (local): `http://localhost:5000/api`
Base URL (production): `<RENDER_BACKEND_URL>/api`

All responses are JSON. Errors use:

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Please correct the highlighted fields.",
    "details": { "email": "A valid email is required." }
  }
}
```

Successful responses return a JSON object directly (for example `{ "user": {...}, "token": "..." }`).
Protected endpoints require `Authorization: Bearer <JWT>`.

---

## Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Create account. Body: `{ name, email, password }`. Returns `201 { message, user, token }`. |
| POST | `/auth/login` | No | Body: `{ email, password }`. Returns `200 { message, user, token }`. |
| POST | `/auth/logout` | Yes | Blacklists the current token. Returns `{ message }`. |
| GET | `/auth/me` | Yes | Returns `{ user }`. |
| PUT | `/auth/profile` | Yes | Body (partial): `{ name, bio, avatar, website }`. Returns `{ message, user }`. |
| PUT | `/auth/password` | Yes | Body: `{ currentPassword, newPassword }`. Returns `{ message }`. |

Validation rules: name 2–60 chars, valid email, password min 8 chars with at least one letter and one number.
Registering with an admin allow-listed email (server config `ADMIN_EMAILS`) grants the `admin` role.

### User object

```json
{
  "id": "65f...",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "user",
  "bio": "",
  "avatar": "",
  "website": "",
  "createdAt": "2026-01-01T10:00:00Z"
}
```

`email` is only returned for the authenticated owner or an admin.

---

## Users — `/api/users`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/users/:id` | No | Public profile `{ user }`. |
| GET | `/users/:id/posts` | No | Published posts by user. Query: `page`, `limit`. Returns `{ posts, pagination }`. |

---

## Posts — `/api/posts`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/posts` | No | Published posts. Query: `page`, `limit`, `search`, `category`, `tag`, `author`, `sort` (`latest` default, `popular`, `oldest`). |
| GET | `/posts/featured` | No | Featured published posts (`?limit=3`). |
| GET | `/posts/mine` | Yes | All posts authored by the caller, including drafts. Query: `page`, `limit`, `status`. |
| GET | `/posts/:id` | Optional | Single post by Mongo id **or** slug. Increments view counter. `{ post }`. Drafts visible only to author/admin. |
| POST | `/posts` | Yes | Create post. Returns `201 { message, post }`. |
| PUT | `/posts/:id` | Yes (author/admin) | Update post. Returns `{ message, post }`. |
| DELETE | `/posts/:id` | Yes (author/admin) | Delete post plus its comments and likes. Returns `{ message }`. |

### Post body (create/update, all fields optional on update)

```json
{
  "title": "Getting started with MongoDB",
  "content": "Markdown body...",
  "excerpt": "Optional summary (auto-generated when omitted)",
  "featuredImage": "/uploads/abc123.jpg",
  "categories": ["Backend"],
  "tags": ["mongodb", "flask"],
  "status": "published",
  "featured": false
}
```

Rules: `title` 3–150 chars, `content` min 20 chars, `status` is `draft` or `published`,
`categories`/`tags` are arrays of at most 10 strings (60 chars each). Slug is generated from the title and is unique.

### Post object

```json
{
  "id": "65f...",
  "title": "...",
  "slug": "getting-started-with-mongodb-a1b2",
  "excerpt": "...",
  "content": "...",
  "featuredImage": "/uploads/...",
  "categories": ["Backend"],
  "tags": ["mongodb"],
  "status": "published",
  "featured": false,
  "views": 12,
  "likeCount": 3,
  "commentCount": 2,
  "likedByMe": false,
  "author": { "id": "65f...", "name": "Ada", "avatar": "" },
  "createdAt": "...",
  "updatedAt": "...",
  "publishedAt": "..."
}
```

`content` is omitted from list responses. `likedByMe` is included only when a token is supplied.

### Pagination object

```json
{ "page": 1, "limit": 9, "total": 42, "pages": 5, "hasNext": true, "hasPrev": false }
```

---

## Comments — `/api/posts/:postId/comments`, `/api/comments/:id`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/posts/:postId/comments` | Optional | Nested comment threads `{ comments, count }`. |
| POST | `/posts/:postId/comments` | Yes | Body: `{ content, parentId? }`. Returns `201 { message, comment }`. |
| PUT | `/comments/:id` | Yes (author/admin) | Body: `{ content }`. Returns `{ message, comment }`. |
| DELETE | `/comments/:id` | Yes (author/admin) | Deletes comment and its replies. Returns `{ message }`. |

Comment object: `{ id, postId, parentId, content, author: {id,name,avatar}, createdAt, updatedAt, replies: [] }`.
`content` is 1–1000 chars.

---

## Likes — `/api/likes/:postId`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/likes/:postId` | Optional | `{ liked, likeCount }`. |
| POST | `/likes/:postId` | Yes | Toggle like/unlike. Returns `{ liked, likeCount, message }`. |

A unique `(postId, user)` index guarantees one like per user.

---

## Uploads — `/api/upload`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/upload` | Yes | `multipart/form-data` field `image`; png/jpg/jpeg/gif/webp, max 5 MB. Returns `{ message, url, filename }`. |

Uploaded files are served from `<BACKEND_ORIGIN>/uploads/<filename>`.

---

## Admin — `/api/admin` (requires `role: admin`)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/admin/stats` | `{ stats: { users, posts, publishedPosts, drafts, comments, likes, views } }` |
| GET | `/admin/users` | All users, paginated. `{ users, pagination }`. |
| PUT | `/admin/users/:id/role` | Body `{ role }` (`user` or `admin`). |
| DELETE | `/admin/users/:id` | Delete user and their content (cannot delete yourself). |
| GET | `/admin/posts` | All posts, paginated. |
| DELETE | `/admin/posts/:id` | Delete any post. |

---

## System

`GET /api/health` → `{ status: "ok", database: "connected" }`.
