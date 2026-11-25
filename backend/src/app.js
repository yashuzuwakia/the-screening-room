import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import movieRoutes from "./routes/movies.js";
import watchlistRoutes from "./routes/watchlist.js";
import seenRoutes from "./routes/seen.js";
import recommendationRoutes from "./routes/recommendations.js";
import communityRoutes from "./routes/community.js";
import communityMediaRoutes, { UPLOAD_DIR } from "./routes/communityMedia.js";
import fs from "node:fs";
import profileAvatarRoutes, { AVATAR_UPLOAD_DIR } from "./routes/profileAvatar.js";
import adminRoutes from "./routes/admin.js";
import { ensureUploadDir } from "./lib/imageUpload.js";

export function createApp() {
  ensureUploadDir(AVATAR_UPLOAD_DIR);
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const app = express();

  // ETag + conditional GET breaks fetch/json clients (304 with no body).
  app.set("etag", false);

  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      tmdb: Boolean(config.tmdbApiKey),
      time: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/auth", profileAvatarRoutes);
  app.use("/api/movies", movieRoutes);
  app.use("/api/watchlist", watchlistRoutes);
  app.use("/api/seen", seenRoutes);
  app.use("/api/recommendations", recommendationRoutes);
  app.use("/api/community", communityRoutes);
  app.use("/api/community", communityMediaRoutes);
  app.use(
    "/api/uploads/community",
    express.static(UPLOAD_DIR, {
      maxAge: "7d",
    }),
  );
  app.use(
    "/api/uploads/avatars",
    express.static(AVATAR_UPLOAD_DIR, {
      maxAge: "7d",
    }),
  );
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);

  return app;
}
