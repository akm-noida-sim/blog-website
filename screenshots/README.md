# Screenshots

Capture UI screenshots here for the portfolio/README. All captures should show real data from a running local stack, not mockups.

## How to capture

1. Start MongoDB, the Flask API (`python backend/run.py`) and the Vite dev server (`npm run dev` in `frontend/`).
2. Optionally run `python backend/seed.py` for realistic content.
3. Log in as `admin@blogsphere.local` so the Admin link is visible.
4. Resize the browser to 1440×900 and capture:

| File | Page |
| --- | --- |
| `01-home-light.png` | Homepage, light mode, with featured story and post grid |
| `02-home-dark.png` | Homepage in dark mode |
| `03-article.png` | Article page with Markdown formatting, like button and comments |
| `04-editor.png` | Write/Edit page with Markdown preview and publishing controls |
| `05-dashboard.png` | Author dashboard with published and draft tabs |
| `06-admin.png` | Admin console overview with statistics |
| `07-profile.png` | Public author profile with their stories |
| `08-explore-mobile.png` | Explore page at 390×844 showing responsive layout |

The included PNGs were captured from the running stack with headless Chrome at 1440×900 (390×844 for the mobile view) and show real database content.

Keep images optimised (PNG or WebP, ideally under 500 KB each) and do not commit browser binaries.
