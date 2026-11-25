import "dotenv/config";

const required = ["DATABASE_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Missing ${key} — copy server/.env.example to server/.env`);
  }
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  tmdbApiKey: process.env.TMDB_API_KEY,
  watchRegion: process.env.WATCH_REGION || "US",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  movieStaleDays: Number(process.env.MOVIE_STALE_DAYS) || 14,
};
