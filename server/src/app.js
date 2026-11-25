import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import movieRoutes from "./routes/movies.js";
import watchlistRoutes from "./routes/watchlist.js";
import recommendationRoutes from "./routes/recommendations.js";
import communityRoutes from "./routes/community.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      tmdb: Boolean(config.tmdbApiKey),
      time: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/movies", movieRoutes);
  app.use("/api/watchlist", watchlistRoutes);
  app.use("/api/recommendations", recommendationRoutes);
  app.use("/api/community", communityRoutes);

  app.use(errorHandler);

  return app;
}
