# Deployment Guide

BlogSphere deploys as three pieces:

1. **MongoDB Atlas** — managed database
2. **Render** — Flask REST API (gunicorn)
3. **Vercel** — React/Vite single-page app

---

## 1. MongoDB Atlas

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Create a database user and copy its password.
3. Under **Network Access**, allow `0.0.0.0/0` (or your Render egress IPs for a tighter setup).
4. Copy the connection string; it looks like:
   `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority`

---

## 2. Render (backend)

`render.yaml` in the repository root defines the service. You can also create it manually:

- **New → Web Service** → connect your GitHub repository
- Runtime: **Python 3**
- Build command: `pip install -r backend/requirements.txt`
- Start command: `cd backend && gunicorn 'run:app' --bind 0.0.0.0:$PORT`

Environment variables:

| Key | Value |
| --- | --- |
| `MONGO_URI` | Your Atlas SRV connection string |
| `DB_NAME` | `blogsphere` |
| `JWT_SECRET` | Long random string (32+ characters) |
| `FLASK_SECRET_KEY` | Another long random string |
| `JWT_EXPIRES_IN` | `604800` (7 days) |
| `FLASK_ENV` | `production` |
| `CORS_ORIGINS` | `https://<your-vercel-app>.vercel.app` |
| `PUBLIC_API_URL` | `https://<your-render-app>.onrender.com` |
| `ADMIN_EMAILS` | Comma-separated emails that should be admins |

After deploy, verify `https://<your-render-app>.onrender.com/api/health` returns:

```json
{ "status": "ok", "database": "connected" }
```

> Render's free tier sleeps idle services, so the first request after inactivity may take a few seconds.

---

## 3. Vercel (frontend)

1. **New → Project** → import the same repository.
2. Root directory: `frontend`
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Environment variable: `VITE_API_URL=https://<your-render-app>.onrender.com/api`
7. Deploy. The included `frontend/vercel.json` rewrites unknown paths to `/index.html` so client-side routes like `/posts/my-story` work on refresh.

Set `CORS_ORIGINS` on Render to your final Vercel domain (including preview URLs you intend to use), then redeploy the backend.

---

## 4. Seeding production (optional)

Only do this once, from a machine that can reach Atlas:

```bash
cd backend
# point .env MONGO_URI at Atlas
python seed.py
```

This writes real users/posts/comments to the configured database. Remove or change the demo accounts afterwards.

---

## 5. Local production-like run

```bash
# backend
cd backend
FLASK_ENV=production gunicorn 'run:app' --bind 0.0.0.0:5000

# frontend (separate terminal)
cd frontend
VITE_API_URL=http://localhost:5000/api npm run build
npx vite preview --host
```

---

## Important notes

- Never commit `.env`, credentials or JWT secrets. Only `.env.example` files are tracked.
- Generated JWTs remain valid until expiry; changing `JWT_SECRET` invalidates every session.
- Uploaded images are written to `backend/uploads`. Render's filesystem is ephemeral, so uploads do not survive a redeploy. For durable media, replace the upload route with S3/Cloudinary (documented as future work in `ARCHITECTURE.md`).
- If your Vercel domain differs from the `CORS_ORIGINS` value, browser requests will fail with a CORS error even though the API works in Postman.
