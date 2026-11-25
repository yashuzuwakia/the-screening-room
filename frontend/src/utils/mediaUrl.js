import { API_BASE } from "../services/apiClient.js";

/** Resolve uploaded image paths for img src (same-origin /api/uploads/...). */
export function resolveApiMediaUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE.replace(/\/api$/, "")}${url}`;
  return url;
}
