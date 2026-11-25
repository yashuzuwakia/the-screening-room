import { Router } from "express";
import { getMovieDetails, listByGenre, listTrending } from "../services/movieSync.js";
import { getUserRating, setRating, deleteRating } from "../services/ratingService.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/trending", async (req, res, next) => {
  try {
    res.json({ movies: await listTrending() });
  } catch (error) {
    next(error);
  }
});

router.get("/discover", async (req, res, next) => {
  try {
    const genreId = Number(req.query.genreId);
    if (!genreId) return res.status(400).json({ error: "genreId is required" });
    res.json({ movies: await listByGenre(genreId) });
  } catch (error) {
    next(error);
  }
});

router.get("/:tmdbId", optionalAuth, async (req, res, next) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ error: "Invalid movie id" });

    const movie = await getMovieDetails(tmdbId);
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
    await deleteRating(req.user.id, Number(req.params.tmdbId));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
