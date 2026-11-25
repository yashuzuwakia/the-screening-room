import { Router } from "express";
import { z } from "zod";
import { login, register } from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { toPublicUser } from "../services/authService.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(40).optional(),
});

router.post("/register", async (req, res, next) => {
  try {
    const body = credentialsSchema.parse(req.body);
    if (!body.displayName) {
      return res.status(400).json({ error: "displayName is required" });
    }
    const result = await register(body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = credentialsSchema.pick({ email: true, password: true }).parse(req.body);
    const result = await login(body);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

export default router;
