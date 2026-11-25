import { Router } from "express";
import {
  getMovieDetails,
  listByGenre,
  listGlobalPopular,
  listTrending,
  searchMovies,
  suggestMovies,
} from "../services/movieSync.js";
import { SEARCH_SORTS } from "../utils/movieSearch.js";
import { getUserRating, setRating, deleteRating } from "../services/ratingService.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/trending", async (req, res, next) => {
  try {
    const scope = typeof req.query.scope === "string" ? req.query.scope : undefined;
    if (scope === "global") {
      return res.json({ movies: await listGlobalPopular(), scope: "global" });
    }
    const region = typeof req.query.region === "string" ? req.query.region.trim().toUpperCase() : undefined;
    if (!region || !/^[A-Z]{2}$/.test(region)) {
      return res.status(400).json({ error: "region query param is required (ISO 3166-1 alpha-2)" });
    }
    res.json({ movies: await listTrending(region), region });
  } catch (error) {
    next(error);
  }
});

router.get("/popular", async (req, res, next) => {
  try {
    res.json({ movies: await listGlobalPopular(), scope: "global" });
  } catch (error) {
    next(error);
  }
});

router.get("/discover", async (req, res, next) => {
  try {
    const genreId = Number(req.query.genreId);
    if (!genreId) return res.status(400).json({ error: "genreId is required" });
    const region = typeof req.query.region === "string" ? req.query.region.trim().toUpperCase() : undefined;
    if (!region || !/^[A-Z]{2}$/.test(region)) {
      return res.status(400).json({ error: "region query param is required (ISO 3166-1 alpha-2)" });
    }
    res.json({ movies: await listByGenre(genreId, region), region });
  } catch (error) {
    next(error);
  }
});

router.get("/search/suggest", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) return res.json({ suggestions: [], query: q });
    const limit = Math.min(Number(req.query.limit) || 8, 12);
    res.json(await suggestMovies(q, limit));
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) {
      return res.json({
        movies: [],
        query: q,
        page: 1,
        totalResults: 0,
        totalPages: 0,
        hasMore: false,
      });
    }
    const sort = typeof req.query.sort === "string" ? req.query.sort : "relevance";
    const safeSort = SEARCH_SORTS.includes(sort) ? sort : "relevance";
    res.json(
      await searchMovies(q, {
        page: req.query.page,
        year: req.query.year,
        minRating: req.query.minRating,
        sort: safeSort,
        region: req.query.region,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:tmdbId", optionalAuth, async (req, res, next) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ error: "Invalid movie id" });

    const watchRegion = typeof req.query.region === "string" ? req.query.region : undefined;
    const movie = await getMovieDetails(tmdbId, watchRegion);
    let userRating = null;
    if (req.user) {
      userRating = await getUserRating(req.user.id, tmdbId);
    }
    res.json({ movie, userRating });
  } catch (error) {
    next(error);
  }
});

router.put("/:tmdbId/rating", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      score: z.coerce.number().min(0.5).max(10),
      review: z.string().max(2000).optional().nullable(),
    });
    const body = schema.parse(req.body);
    const tmdbId = Number(req.params.tmdbId);
    const result = await setRating(req.user.id, tmdbId, body.score, body.review ?? null);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.delete("/:tmdbId/rating", requireAuth, async (req, res, next) => {
  try {
    const movie = await deleteRating(req.user.id, Number(req.params.tmdbId));
    res.json({ movie, userRating: null });
  } catch (error) {
    next(error);
  }
});

export default router;
