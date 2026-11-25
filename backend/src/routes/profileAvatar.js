import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { saveBase64Image } from "../lib/imageUpload.js";
import { updateProfile } from "../services/authService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AVATAR_UPLOAD_DIR = path.join(__dirname, "../../uploads/avatars");

const uploadSchema = z.object({
  data: z.string().min(1),
  mimeType: z.string().min(3).max(64),
  name: z.string().max(200).optional(),
});

const router = Router();

router.post("/me/avatar", requireAuth, async (req, res, next) => {
  try {
    const { data, mimeType, name } = uploadSchema.parse(req.body);
    const url = saveBase64Image({
      uploadDir: AVATAR_UPLOAD_DIR,
      uploadSubdir: "avatars",
      data,
      mimeType,
      name,
      maxBytes: 2 * 1024 * 1024,
    });
    const user = await updateProfile(req.user.id, { avatarUrl: url });
    res.status(201).json({ url, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Missing image data" });
    }
    next(error);
  }
});

export default router;
