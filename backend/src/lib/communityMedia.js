const MAX_MEDIA = 4;
const IMAGE_EXT = /\.(gif|jpe?g|png|webp|avif)(\?.*)?$/i;

const ALLOWED_HOSTS = new Set([
  "media.giphy.com",
  "i.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com",
  "media.tenor.com",
  "c.tenor.com",
  "i.imgur.com",
]);

export const COMMUNITY_MEDIA_MAX = MAX_MEDIA;

export function normalizeMediaUrls(input) {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    if (!isAllowedMediaUrl(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_MEDIA) break;
  }
  return out;
}

export function isAllowedMediaUrl(url) {
  if (typeof url === "string" && url.startsWith("/api/uploads/community/")) return true;
  if (typeof url === "string" && url.startsWith("/uploads/community/")) return true;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (parsed.protocol === "http:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    return false;
  }
  if (parsed.pathname.includes("/uploads/community/") || parsed.pathname.startsWith("/api/uploads/community/")) {
    return true;
  }
  if (ALLOWED_HOSTS.has(parsed.hostname)) return true;
  return IMAGE_EXT.test(parsed.pathname);
}

export function assertCommentContent({ body, mediaUrls }) {
  const text = body?.trim() ?? "";
  const media = normalizeMediaUrls(mediaUrls);
  if (!text && media.length === 0) {
    const err = new Error("Add a message, image, or GIF");
    err.status = 400;
    throw err;
  }
  return { body: text, mediaUrls: media };
}

export function readMediaUrlsFromDb(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((u) => typeof u === "string");
  return [];
}
