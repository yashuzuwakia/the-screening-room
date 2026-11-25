import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  createDiscoverPin,
  deleteDiscoverPin,
  enrichPinsWithTitles,
  listDiscoverPins,
  reorderDiscoverPins,
  resetDiscoverPins,
  updateDiscoverPin,
} from "../services/discoverPinService.js";
import {
  createDiscoverExclusion,
  deleteDiscoverExclusion,
  enrichExclusionsWithTitles,
  listDiscoverExclusions,
  updateDiscoverExclusion,
} from "../services/discoverExclusionService.js";
import { searchMovies } from "../services/movieSync.js";

const router = Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(requireAuth, requireAdmin);

const pinSchema = z.object({
  region: z.string().length(2),
  listKind: z.enum(["regional", "genre", "global"]),
  genreId: z.coerce.number().int().optional().nullable(),
  tmdbId: z.coerce.number().int().positive(),
  position: z.coerce.number().int().min(1).max(20).optional(),
  overrides: z.record(z.unknown()).optional().nullable(),
  active: z.boolean().optional(),
});

router.get("/discover-pins", async (req, res, next) => {
  try {
    const region = typeof req.query.region === "string" ? req.query.region : undefined;
    const listKind = typeof req.query.listKind === "string" ? req.query.listKind : undefined;
    const genreId = req.query.genreId != null ? Number(req.query.genreId) : undefined;
    const pins = await listDiscoverPins({ region, listKind, genreId });
    res.json({ pins: await enrichPinsWithTitles(pins) });
  } catch (error) {
    next(error);
  }
});

const reorderSchema = z.object({
  region: z.string().length(2),
  listKind: z.enum(["regional", "genre", "global"]),
  genreId: z.coerce.number().int().optional().nullable(),
  orderedTmdbIds: z.array(z.coerce.number().int().positive()).max(20),
});

const slotSchema = z.object({
  region: z.string().length(2),
  listKind: z.enum(["regional", "genre", "global"]),
  genreId: z.coerce.number().int().optional().nullable(),
});

router.post("/discover-pins/reset", async (req, res, next) => {
  try {
    const body = slotSchema.parse(req.body);
    const result = await resetDiscoverPins(body);
    res.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.issues.map((i) => i.message).join("; ") || "Invalid reset data",
      });
    }
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.post("/discover-pins/reorder", async (req, res, next) => {
  try {
    const body = reorderSchema.parse(req.body);
    await reorderDiscoverPins(req.user.id, body);
    const pins = await listDiscoverPins({
      region: body.region,
      listKind: body.listKind,
      genreId: body.listKind === "genre" ? body.genreId : undefined,
    });
    res.json({ pins: await enrichPinsWithTitles(pins) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.issues.map((i) => i.message).join("; ") || "Invalid reorder data",
      });
    }
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.post("/discover-pins", async (req, res, next) => {
  try {
    const body = pinSchema.parse(req.body);
    const pin = await createDiscoverPin(req.user.id, body);
    res.status(201).json({ pin });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.issues.map((i) => i.message).join("; ") || "Invalid pin data",
      });
    }
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.code === "P2021") {
      return res.status(503).json({
        error: "Discover pins table is missing. In backend/: npx prisma db push, then restart the API.",
      });
    }
    next(error);
  }
});

router.patch("/discover-pins/:id", async (req, res, next) => {
  try {
    const schema = z.object({
      position: z.coerce.number().int().min(1).max(20).optional(),
      active: z.boolean().optional(),
      overrides: z.record(z.unknown()).optional().nullable(),
    });
    const body = schema.parse(req.body);
    const pin = await updateDiscoverPin(req.params.id, body);
    const [enriched] = await enrichPinsWithTitles([pin]);
    res.json({ pin: enriched ?? pin });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.issues.map((i) => i.message).join("; ") || "Invalid pin data",
      });
    }
    if (error.status === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
});

router.delete("/discover-pins/:id", async (req, res, next) => {
  try {
    await deleteDiscoverPin(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

const exclusionSchema = z.object({
  region: z.string().length(2),
  listKind: z.enum(["regional", "genre", "global"]),
  genreId: z.coerce.number().int().optional().nullable(),
  tmdbId: z.coerce.number().int().positive(),
  active: z.boolean().optional(),
});

router.get("/discover-exclusions", async (req, res, next) => {
  try {
    const region = typeof req.query.region === "string" ? req.query.region : undefined;
    const listKind = typeof req.query.listKind === "string" ? req.query.listKind : undefined;
    const genreId = req.query.genreId != null ? Number(req.query.genreId) : undefined;
    const rows = await listDiscoverExclusions({ region, listKind, genreId });
    res.json({ exclusions: await enrichExclusionsWithTitles(rows) });
  } catch (error) {
    next(error);
  }
});

router.post("/discover-exclusions", async (req, res, next) => {
  try {
    const body = exclusionSchema.parse(req.body);
    const row = await createDiscoverExclusion(req.user.id, body);
    const [enriched] = await enrichExclusionsWithTitles([row]);
    res.status(201).json({ exclusion: enriched ?? row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.issues.map((i) => i.message).join("; ") || "Invalid exclusion data",
      });
    }
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.code === "P2021") {
      return res.status(503).json({
        error: "Discover exclusions table is missing. In backend/: npx prisma db push, then restart the API.",
      });
    }
    next(error);
  }
});

router.patch("/discover-exclusions/:id", async (req, res, next) => {
  try {
    const schema = z.object({ active: z.boolean().optional() });
    const body = schema.parse(req.body);
    const row = await updateDiscoverExclusion(req.params.id, body);
    const [enriched] = await enrichExclusionsWithTitles([row]);
    res.json({ exclusion: enriched ?? row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.issues.map((i) => i.message).join("; ") || "Invalid exclusion data",
      });
    }
    next(error);
  }
});

router.delete("/discover-exclusions/:id", async (req, res, next) => {
  try {
    await deleteDiscoverExclusion(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/movies/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const year = req.query.year != null && req.query.year !== "" ? Number(req.query.year) : undefined;
    if (q.length < 1) return res.json({ movies: [], query: q });
    const result = await searchMovies(q, {
      year: Number.isFinite(year) ? year : undefined,
      sort: "relevance",
      page: 1,
    });
    res.json({ movies: result.movies?.slice(0, 12) ?? [], query: q });
  } catch (error) {
    next(error);
  }
});

export default router;
