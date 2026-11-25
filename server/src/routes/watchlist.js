import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { addToWatchlist, listWatchlist, removeFromWatchlist } from "../services/watchlistService.js";

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

router.delete("/:tmdbId", async (req, res, next) => {
  try {
    await removeFromWatchlist(req.user.id, Number(req.params.tmdbId));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
