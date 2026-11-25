import { Router } from "express";
import { z } from "zod";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  addReply,
  createPost,
  listFeed,
  softDeletePost,
  toggleLike,
} from "../services/communityService.js";

const router = Router();

router.get("/feed", optionalAuth, async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.take) || 20, 50);
    const cursor = req.query.cursor;
    res.json(await listFeed({ cursor, take }));
  } catch (error) {
    next(error);
  }
});

router.post("/posts", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(3).max(160),
      body: z.string().min(1).max(8000),
      type: z.enum(["discussion", "list", "mood"]).optional(),
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
      body: z.string().min(1).max(4000),
      parentId: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const reply = await addReply(req.user.id, req.params.id, body.body, body.parentId);
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
