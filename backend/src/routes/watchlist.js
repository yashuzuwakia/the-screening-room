import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
  removeManyFromWatchlist,
} from "../services/watchlistService.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    res.json({ items: await listWatchlist(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const tmdbId = Number(req.body.tmdbId);
    if (!tmdbId) return res.status(400).json({ error: "tmdbId is required" });
    const movie = await addToWatchlist(req.user.id, tmdbId);
    res.status(201).json({ movie });
  } catch (error) {
    next(error);
  }
});

router.delete("/bulk", async (req, res, next) => {
  try {
    const body = z.object({ tmdbIds: z.array(z.coerce.number().int().positive()).min(1).max(100) }).parse(req.body);
    const removed = await removeManyFromWatchlist(req.user.id, body.tmdbIds);
    res.json({ removed });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.delete("/:tmdbId", async (req, res, next) => {
  try {
    await removeFromWatchlist(req.user.id, Number(req.params.tmdbId));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
