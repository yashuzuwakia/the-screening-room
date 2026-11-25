# The Screening Room — repository layout

This repo is a **monorepo**: two apps, one database, shared at the root.

```text
the-screening-room/
├── frontend/          React SPA (Vite) — browser UI only
├── backend/           Express API (Node) — data, auth, TMDB proxy
├── docker-compose.yml Postgres for the API
├── package.json       Root scripts (start, dev, db:*)
├── ARCHITECTURE.md    This file
└── README.md          Quick start
```

The `frontend` and `backend` folders each have their own `package.json` and dependencies. They talk over **HTTP** (`/api` in dev via Vite proxy).

---

## Frontend (`frontend/`)

**Runs on:** Vite dev server (default `http://localhost:5173`)

**Responsible for:**

| Area | Location | Notes |
|------|-----------|--------|
| Pages & routing | `src/app/router.jsx`, `src/pages/` | UI only |
| Components | `src/components/` | No direct DB access |
| Client state | `src/store/` | Profile/watchlist; syncs via API when enabled |
| TMDB fallback | `src/services/tmdbClient.js` | Used when API is down (`VITE_USE_API`) |
| API client | `src/services/apiClient.js` | JWT + `fetch('/api/...')` |
| Scoring (offline) | `src/services/recommendationEngine.js` | Same logic as backend when API unavailable |
| Styles | `src/styles/` | Design tokens, layout |

**Env:** copy `frontend/.env.example` → `frontend/.env.local` (`VITE_*`).

**Must not:** import from `backend/`, embed secrets, or call Postgres.

---

## Backend (`backend/`)

**Runs on:** Express (default `http://localhost:5000`)

**Responsible for:**

| Area | Location | Notes |
|------|-----------|--------|
| HTTP routes | `src/routes/` | `/api/auth`, `movies`, `watchlist`, `recommendations`, `community` |
| Business logic | `src/services/` | Auth, ratings, watchlist, TMDB sync, recommendations |
| Database | `prisma/schema.prisma` | PostgreSQL models |
| TMDB (primary) | `src/lib/tmdb.js` | Server-side API key |
| Middleware | `src/middleware/` | JWT auth, errors |

**Env:** copy `backend/.env.example` → `backend/.env` (`DATABASE_URL`, `JWT_SECRET`, `TMDB_API_KEY`, …).

**Must not:** serve the React bundle (except optional static hosting in production).

---

## Shared infrastructure (repo root)

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres 16 for `backend` |
| `npm run dev` | Starts **frontend** + **backend** together |
| `npm run db:up` / `db:push` | Database for **backend** only |

---

## Request flow (API mode)

```text
Browser → frontend (React)
            → fetch /api/*  →  Vite proxy  →  backend (Express)
                                                  → Prisma → Postgres
                                                  → TMDB (lazy movie cache)
```

When the backend is offline, **frontend** may still load movies via **browser TMDB** or the offline catalog (`src/data/fallbackMovies.js`).

---

## Legacy folder

If you still see `server/`, it is a duplicate of `backend/` from an older layout. Use **`backend/`** only; `server/` can be deleted when no process is locking it.
