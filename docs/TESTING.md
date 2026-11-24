# Testing Guide

## Automated API tests

The pytest suite uses a dedicated MongoDB database (`blogsphere_test`) and Flask's test client. It clears collections before every test, so it never touches your development data.

```bash
cd backend
pip install -r requirements.txt
python -m pytest -q
```

Covered areas:

| File | What it verifies |
| --- | --- |
| `test_auth.py` | Registration with bcrypt hashing, duplicates, validation errors, login, `/auth/me`, logout blacklisting, profile and password updates |
| `test_posts.py` | Create/read by id and slug, private drafts, search/category/tag/sort, pagination metadata, ownership, delete, publishing drafts |
| `test_comments.py` | Add/edit/delete, nested replies and cascade deletion, comment counters, ownership, authentication |
| `test_likes.py` | Toggle, per-user uniqueness, like counts, anonymous status |
| `test_authorization.py` | Protected endpoints, cross-user edit/delete rejection, admin allow-list, admin actions, self-delete protection |

Run a single area with `python -m pytest tests/test_posts.py -q`.

---

## Manual end-to-end checklist

Use these steps after a fresh install to verify the whole product, not just the API.

1. **Health** — `GET /api/health` returns `status: ok`.
2. **Register** — create `reader@example.com` in the UI; you land on the homepage with a token.
3. **Create** — open Write, fill title/body, add two tags, upload an image, save as **Published**.
4. **Read** — the article page renders Markdown, the cover image loads, views increment on refresh.
5. **Like** — click the heart; count changes and the button stays active after refresh.
6. **Comment** — add a comment, reply to it, edit your reply, delete the parent; the reply disappears too.
7. **Draft** — create a draft; confirm it is absent from the homepage and visible in Dashboard → Drafts. Log out and try opening its URL directly: 404.
8. **Authorization** — register a second user and attempt to edit the first user's post/comment via Postman; expect `403`.
9. **Profile** — update bio/avatar and password, then log in with the new password.
10. **Admin** — register with an `ADMIN_EMAILS` address, open `/admin`, check stats, promote a user, delete a post.
11. **Search & filters** — use Explore to search a title, filter by category/tag and change sort order.
12. **Theme & responsive** — toggle dark mode, reload, resize to mobile width and check navigation/cards.
13. **Logout** — reuse the old token in Postman; `/auth/me` should return `401`.

---

## Postman collection outline

Create a collection with a variable `token` and an `Authorization: Bearer {{token}}` header on protected requests:

```text
Auth
  POST {{baseUrl}}/auth/register
  POST {{baseUrl}}/auth/login
  GET  {{baseUrl}}/auth/me
  POST {{baseUrl}}/auth/logout
Posts
  GET  {{baseUrl}}/posts?search=flask&page=1&limit=9
  GET  {{baseUrl}}/posts/featured
  GET  {{baseUrl}}/posts/:id
  POST {{baseUrl}}/posts
  PUT  {{baseUrl}}/posts/:id
  DELETE {{baseUrl}}/posts/:id
Comments / Likes
  GET/POST {{baseUrl}}/posts/:id/comments
  PUT/DELETE {{baseUrl}}/comments/:id
  GET/POST {{baseUrl}}/likes/:id
Admin
  GET {{baseUrl}}/admin/stats
  GET {{baseUrl}}/admin/users
```

See [API.md](API.md) for exact request and response bodies.
