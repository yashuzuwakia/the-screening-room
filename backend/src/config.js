import "dotenv/config";

const required = ["DATABASE_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Missing ${key} — copy backend/.env.example to backend/.env`);
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
  publicApiOrigin: process.env.PUBLIC_API_ORIGIN || "",
  giphyApiKey: process.env.GIPHY_API_KEY || "",
  movieStaleDays: Number(process.env.MOVIE_STALE_DAYS) || 14,
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 60,
  /** When SMTP is off, return reset link in API (local dev). Set false in production. */
  exposePasswordResetLink:
    process.env.PASSWORD_RESET_EXPOSE_LINK === "true" ||
    process.env.NODE_ENV !== "production" ||
    (process.env.CLIENT_ORIGIN || "").includes("localhost"),
  /** When Gmail SMTP is missing, send via Ethereal test inbox (dev) and show preview URL. */
  allowEtherealEmail:
    process.env.USE_ETHEREAL_EMAIL !== "false" &&
    (!process.env.SMTP_USER || !process.env.SMTP_PASS),
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "",
  },
};
