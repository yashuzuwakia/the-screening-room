import { Router } from "express";
import { z } from "zod";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  addReply,
  createMovieDiscussionPost,
  createPost,
  getPost,
  listFeed,
  listPostsByMovie,
  softDeletePost,
  toggleLike,
} from "../services/communityService.js";

const router = Router();

router.get("/movies/:tmdbId/posts", optionalAuth, async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take) || 20, 50);
    const cursor = req.query.cursor;
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ error: "Invalid movie id" });
    res.json(await listPostsByMovie(tmdbId, { cursor, take }));
  } catch (error) {
    next(error);
  }
});

router.post("/movies/:tmdbId/posts", requireAuth, async (req, res, next) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ error: "Invalid movie id" });
    const schema = z.object({
      body: z.string().max(4000).optional().default(""),
      title: z.string().min(3).max(160).optional(),
      mediaUrls: z.array(z.string().max(2048)).max(4).optional().default([]),
    });
    const body = schema.parse(req.body);
    const post = await createMovieDiscussionPost(req.user.id, tmdbId, body);
    res.status(201).json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.get("/feed", optionalAuth, async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take) || 20, 50);
    const cursor = req.query.cursor;
    res.json(await listFeed({ cursor, take }));
  } catch (error) {
    next(error);
  }
});

router.get("/posts/:id", optionalAuth, async (req, res, next) => {
  try {
    res.json(await getPost(req.params.id, req.user?.id ?? null));
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
});

router.post("/posts", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(3).max(160),
      body: z.string().max(8000).optional().default(""),
      mediaUrls: z.array(z.string().max(2048)).max(4).optional().default([]),
      type: z.enum(["discussion", "list", "mood", "movie"]).optional(),
      movieTmdbId: z.coerce.number().int().optional().nullable(),
    });
    const body = schema.parse(req.body);
    const post = await createPost(req.user.id, body);
    res.status(201).json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.post("/posts/:id/replies", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      body: z.string().max(4000).optional().default(""),
      mediaUrls: z.array(z.string().max(2048)).max(4).optional().default([]),
      parentId: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const reply = await addReply(req.user.id, req.params.id, body.body, body.parentId, body.mediaUrls);
    res.status(201).json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.post("/posts/:id/like", requireAuth, async (req, res, next) => {
  try {
    res.json(await toggleLike(req.user.id, req.params.id));
  } catch (error) {
    next(error);
  }
});

router.delete("/posts/:id", requireAuth, async (req, res, next) => {
  try {
    await softDeletePost(req.user.id, req.params.id, req.user.role);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
