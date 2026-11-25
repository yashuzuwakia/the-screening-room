import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, "../../uploads/community");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MIME_TO_EXT = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/x-png": ".png",
};

const uploadSchema = z.object({
  data: z.string().min(1),
  mimeType: z.string().min(3).max(64),
  name: z.string().max(200).optional(),
});

function extFromMime(mimeType, name) {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (MIME_TO_EXT[normalized]) return MIME_TO_EXT[normalized];
  const fromName = name ? path.extname(name).toLowerCase() : "";
  if ([".gif", ".jpg", ".jpeg", ".png", ".webp"].includes(fromName)) {
    return fromName === ".jpeg" ? ".jpg" : fromName;
  }
  return null;
}

const router = Router();

router.post("/media/upload", requireAuth, (req, res, next) => {
  try {
    const { data, mimeType, name } = uploadSchema.parse(req.body);
    const ext = extFromMime(mimeType, name);
    if (!ext) {
      return res.status(400).json({ error: "Only GIF, JPEG, PNG, or WebP images are allowed" });
    }

    let buffer;
    try {
      buffer = Buffer.from(data, "base64");
    } catch {
      return res.status(400).json({ error: "Invalid image data" });
    }

    if (buffer.length < 16) {
      return res.status(400).json({ error: "Image file is too small" });
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Image must be 5 MB or smaller" });
    }

    const filename = `${randomUUID()}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    const url = `/api/uploads/community/${filename}`;
    res.status(201).json({ url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Missing image data" });
    }
    next(error);
  }
});

router.get("/gifs/config", (_req, res) => {
  res.json({ searchEnabled: Boolean(config.giphyApiKey) });
});

router.get("/gifs", async (req, res, next) => {
  try {
    const query = String(req.query.q ?? "").trim();
    if (query.length < 2) return res.json({ items: [] });
    const key = config.giphyApiKey;
    if (!key) {
      return res.json({ items: [], hint: "Set GIPHY_API_KEY on the API to enable GIF search." });
    }
    const url = new URL("https://api.giphy.com/v1/gifs/search");
    url.searchParams.set("api_key", key);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "12");
    url.searchParams.set("rating", "pg-13");
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: "GIF search unavailable" });
    }
    const payload = await response.json();
    const items = (payload.data ?? [])
      .map((gif) => ({
        id: gif.id,
        title: gif.title || query,
        url:
          gif.images?.fixed_height?.url ||
          gif.images?.downsized_medium?.url ||
          gif.images?.original?.url ||
          null,
        previewUrl: gif.images?.fixed_height_small?.url || gif.images?.preview_gif?.url || null,
      }))
      .filter((item) => item.url);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

export default router;
