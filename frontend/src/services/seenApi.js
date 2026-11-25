import { apiFetch, getAuthToken, isApiMode } from "./apiClient.js";

export async function fetchSeenTmdbIds() {
  if (!isApiMode() || !getAuthToken()) return null;
  const data = await apiFetch("/seen");
  return Array.isArray(data.tmdbIds) ? data.tmdbIds.map(Number) : [];
}

export async function syncSeenToServer(tmdbIds, source = "watched") {
  if (!isApiMode() || !getAuthToken() || !tmdbIds.length) return;
  try {
    await apiFetch("/seen", {
      method: "POST",
      body: { tmdbIds, source },
    });
  } catch (error) {
    console.warn("[seenApi] sync failed", error);
  }
}

export async function removeSeenFromServer(tmdbId) {
  if (!isApiMode() || !getAuthToken()) return;
  try {
    await apiFetch(`/seen/${tmdbId}`, { method: "DELETE" });
  } catch (error) {
    console.warn("[seenApi] remove failed", error);
  }
}
