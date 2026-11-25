import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { addSeenMovies, listSeenTmdbIds, removeSeenMovies } from "../services/seenService.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const tmdbIds = await listSeenTmdbIds(req.user.id);
    res.json({ tmdbIds });
  } catch (error) {
    next(error);
  }
});

router.delete("/:tmdbId", async (req, res, next) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return res.status(400).json({ error: "Invalid tmdbId" });
    const result = await removeSeenMovies(req.user.id, [tmdbId]);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = z
      .object({
        tmdbIds: z.array(z.coerce.number().int().positive()).min(1).max(50),
        source: z.enum(["watched", "passed"]).optional(),
      })
      .parse(req.body);
    const result = await addSeenMovies(req.user.id, body.tmdbIds, body.source ?? "watched");
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

export default router;
