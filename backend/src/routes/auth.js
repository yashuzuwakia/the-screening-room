import { Router } from "express";
import { z } from "zod";
import {
  login,
  register,
  requestPasswordReset,
  resetPasswordWithToken,
  updateProfile,
} from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { toPublicUser } from "../services/authService.js";
import { passwordResetDeliveryStatus } from "../services/emailService.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(40).optional(),
  watchRegion: z.string().length(2).optional(),
});

const profilePatchSchema = z
  .object({
    watchRegion: z.string().length(2).optional(),
    displayName: z.string().min(1).max(40).optional(),
    avatarUrl: z.string().max(500).nullable().optional(),
    currentPassword: z.string().min(8).max(128).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine((body) => !body.newPassword || body.currentPassword, {
    message: "currentPassword is required when setting newPassword",
    path: ["currentPassword"],
  });

const forgotSchema = z.object({
  email: z.string().email().max(120),
});

const resetSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
});

router.post("/register", async (req, res, next) => {
  try {
    const body = credentialsSchema.parse(req.body);
    if (!body.displayName) {
      return res.status(400).json({ error: "displayName is required" });
    }
    if (!body.watchRegion) {
      return res.status(400).json({ error: "watchRegion is required" });
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

router.get("/password-reset/config", (_req, res) => {
  res.json(passwordResetDeliveryStatus());
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const body = forgotSchema.parse(req.body);
    const result = await requestPasswordReset(body.email);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const body = resetSchema.parse(req.body);
    const result = await resetPasswordWithToken(body.token, body.password);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const body = profilePatchSchema.parse(req.body);
    const user = await updateProfile(req.user.id, body);
    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    next(error);
  }
});

export default router;
