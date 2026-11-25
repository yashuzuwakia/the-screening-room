# The Screening Room

A platform for movie lovers to discover what to watch, keep a watchlist, and discuss films. Get a scored recommendation based on your mood, genres, streaming services, and available time.

Monorepo layout: [ARCHITECTURE.md](./ARCHITECTURE.md) (`frontend/` React + Vite, `backend/` Express + Prisma + Postgres).

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** from your Node install (run commands in this project folder; avoid unrelated `npm` on your PATH)
- **Docker Desktop** (or compatible engine) for Postgres when using API mode
- Optional: [TMDB](https://www.themoviedb.org/settings/api) API key (v3)

---

## First-time setup

From the repo root (`the-screening-room/`):

```bash
# 1. Install dependencies (all three package roots)
npm install
npm install --prefix frontend
npm install --prefix backend

# 2. Frontend env
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local — see table below

# 3. Backend + database (only if VITE_USE_API=true)
docker compose up -d
cp backend/.env.example backend/.env
# Set TMDB_API_KEY and JWT_SECRET in backend/.env

npm run db:push
```

---

## How to run

| Goal | Command (from repo root) | URLs |
|------|---------------------------|------|
| **UI only** (TMDB in browser or offline catalog) | `npm start` | http://localhost:5173 |
| **UI + API + DB** | `npm run dev` | UI :5173, API :5000, `/api` proxied by Vite |
| **API only** | `npm run dev:api` | http://localhost:5000/api |
| **Production build** | `npm run build` | Output in `frontend/dist/` |
| **Preview production build** | `npm run preview` | Vite preview server |

### Database

| Command | What it does |
|---------|----------------|
| `npm run db:up` | Start Postgres (`docker compose up -d`) |
| `npm run db:push` | Apply `backend/prisma/schema.prisma` to the DB |
| `npm run db:generate` | Regenerate Prisma client after schema edits |
| `npm run db:studio` | Open Prisma Studio (edit users, promote admin, etc.) |

### Lint

```bash
npm run lint
```

### Windows (PowerShell)

Use `;` instead of `&&` between commands, or run each line separately:

```powershell
cd backend; npm run db:push
```

---

## Environment variables

### Frontend (`frontend/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_USE_API` | No | `true` = auth, watchlist, server recommendations, community via `/api` |
| `VITE_TMDB_API_KEY` | No* | TMDB in the browser when API mode is off |
| `VITE_WATCH_REGION` | No | Default country for streaming (e.g. `US`) |
| `VITE_API_URL` | No | Empty in dev (Vite proxy); set in production if API is on another host |

\* With `VITE_USE_API=true`, TMDB is normally called from the **backend** (`TMDB_API_KEY` in `backend/.env`).

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes (API mode) | Postgres connection string (matches `docker-compose.yml` by default) |
| `JWT_SECRET` | Yes (API mode) | Signs login tokens |
| `TMDB_API_KEY` | Strongly recommended | Discover, details, recommendations |
| `CLIENT_ORIGIN` | Yes | CORS — default `http://localhost:5173` |
| `SMTP_*` | No | Password reset email (Gmail app password, etc.) |

See [backend/README.md](./backend/README.md) for API routes.

---

## Make a user an admin

Admin users can curate Discover (pins, exclusions, reorder) and delete others’ community posts. The app checks `users.role === "admin"` on the JWT after login.

1. Register a normal account in the UI (`/login`).
2. Promote the user in Postgres using **one** of:

**Prisma Studio (easiest)**

```bash
cd backend
npm run db:studio
```

Open the `users` table → edit your row → set **`role`** to `admin` → save.

**SQL**

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Example with `docker compose` (adjust user/db if you changed defaults):

```bash
docker compose exec -T db psql -U moviematch -d moviematch -c "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
```

3. **Sign out and sign in again** so a new JWT includes the `admin` role.
4. In the UI: **Profile** shows an admin Discover curation card; **Discover** gets the curator controls when API mode is on.

---

## Routes (frontend)

```text
/                 Home
/discover       Browse (?tab=action&sort=rating)
/find             Wizard (Surprise Me skips genre → platforms)
/results          Match + passes / already seen
/watchlist
/community
/profile        Edit profile, watch country, already seen list
/login            Register / login (API mode)
/forgot-password  Reset flow (SMTP or dev Ethereal)
/admin/discover   Admin: hide/search titles (admin only)
/movie/:id
```

---

## Recommendation pipeline (summary)

```text
Preferences → TMDB discover (with runtime/platform filters) → score → top 10
```

Scoring: `frontend/src/services/recommendationEngine.js` (offline) and matching logic in `backend/`. Offline catalog: `frontend/src/data/fallbackMovies.js`.

**Results extras (when using the app):**

- **`excludeIds`** — passed, already seen, recent picks for same wizard combo
- **`/api/seen`** — account sync for “I’ve seen it”
- **`?resume=1`** — Home “View results” keeps the same top pick

---

## Project structure

```text
frontend/src/     React UI, hooks, TMDB client fallback
backend/src/      Express routes + services + Prisma
docker-compose.yml  Postgres 16
```

Deeper breakdown: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

Movie data and images from [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.