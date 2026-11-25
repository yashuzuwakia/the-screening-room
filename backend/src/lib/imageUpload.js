import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const MIME_TO_EXT = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/x-png": ".png",
};

export function extFromMime(mimeType, name) {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (MIME_TO_EXT[normalized]) return MIME_TO_EXT[normalized];
  const fromName = name ? path.extname(name).toLowerCase() : "";
  if ([".gif", ".jpg", ".jpeg", ".png", ".webp"].includes(fromName)) {
    return fromName === ".jpeg" ? ".jpg" : fromName;
  }
  return null;
}

export function ensureUploadDir(absoluteDir) {
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }
}

/**
 * @param {string} uploadSubdir e.g. "avatars" or "community"
 * @returns {string} public URL path `/api/uploads/<subdir>/<file>`
 */
export function saveBase64Image({ uploadDir, uploadSubdir, data, mimeType, name, maxBytes = 5 * 1024 * 1024 }) {
  const ext = extFromMime(mimeType, name);
  if (!ext) {
    const err = new Error("Only GIF, JPEG, PNG, or WebP images are allowed");
    err.status = 400;
    throw err;
  }

  let buffer;
  try {
    buffer = Buffer.from(data, "base64");
  } catch {
    const err = new Error("Invalid image data");
    err.status = 400;
    throw err;
  }

  if (buffer.length < 16) {
    const err = new Error("Image file is too small");
    err.status = 400;
    throw err;
  }
  if (buffer.length > maxBytes) {
    const err = new Error(`Image must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller`);
    err.status = 400;
    throw err;
  }

  ensureUploadDir(uploadDir);
  const filename = `${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/api/uploads/${uploadSubdir}/${filename}`;
}
