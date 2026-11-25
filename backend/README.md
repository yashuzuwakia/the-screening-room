# The Screening Room API

Express + PostgreSQL (Prisma) backend for auth, watchlists, **community ratings**, recommendations, and community posts. TMDB is called **only from the server**.

## Quick start

```bash
# From repo root
docker compose up -d

cd backend
cp .env.example .env
# Set TMDB_API_KEY and JWT_SECRET in .env

npm install
npm run db:push
npm run dev
```

API base: `http://localhost:5000/api`

Frontend dev (from repo root) proxies `/api` → `5000` when you run `npm start`.

## Main endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness |
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | JWT login |
| GET | `/auth/me` | Bearer | Current user |
| GET | `/movies/trending` | — | Trending (TMDB + DB stats) |
| GET | `/movies/discover?genreId=28` | — | By genre |
| GET | `/movies/:tmdbId` | optional | Details + your rating |
| PUT | `/movies/:tmdbId/rating` | Bearer | Your 0.5–10 score + review |
| DELETE | `/movies/:tmdbId/rating` | Bearer | Remove your rating |
| GET | `/watchlist` | Bearer | Your watchlist |
| POST | `/watchlist` | Bearer | `{ "tmdbId": 329865 }` |
| DELETE | `/watchlist/:tmdbId` | Bearer | Remove |
| POST | `/recommendations` | optional | Wizard prefs → ranked list |
| GET | `/community/feed` | — | Posts |
| GET | `/community/posts/:id` | optional | Thread + replies + `likedByViewer` |
| POST | `/community/posts` | Bearer | New thread |
| POST | `/community/posts/:id/replies` | Bearer | Reply |
| POST | `/community/posts/:id/like` | Bearer | Toggle like |
| DELETE | `/community/posts/:id` | Bearer | Soft-delete (author/admin) |

## Data you own

- **Users** — email + bcrypt password
- **Movies** — cached rows keyed by `tmdb_id` (synced on demand, not manual daily work)
- **Ratings** — per-user scores; `community_avg` / `community_count` on `movies`
- **Watchlist**, **community posts/replies/likes**, **recommendation session** history

## Admin users

Set `role` to `admin` on the `users` table (`admin` or `user`, default `user`). Full steps and example SQL are in the [root README](../README.md#make-a-user-an-admin).

After changing role, the user must **log in again** so the JWT picks up `admin`.

Admins get Discover curation (`/api/admin/*`) and may delete others’ community posts.

## Remove data

- Users delete their own ratings, watchlist items, posts via API.
- `DELETE /community/posts/:id` sets `deleted_at` (soft delete).
- Or use `npm run db:studio` / SQL for one-off fixes.
