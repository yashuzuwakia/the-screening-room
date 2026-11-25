import { apiFetch, isApiMode } from "./apiClient.js";

function requireApi() {
  if (!isApiMode()) throw new Error("Admin tools require the backend (set VITE_USE_API=true).");
}

export async function listDiscoverPins(params = {}) {
  requireApi();
  const query = new URLSearchParams();
  if (params.region) query.set("region", params.region);
  if (params.listKind) query.set("listKind", params.listKind);
  if (params.genreId != null) query.set("genreId", String(params.genreId));
  const qs = query.toString();
  return apiFetch(`/admin/discover-pins${qs ? `?${qs}` : ""}`);
}

export async function createDiscoverPin(body) {
  requireApi();
  return apiFetch("/admin/discover-pins", { method: "POST", body });
}

export async function reorderDiscoverPins(body) {
  requireApi();
  return apiFetch("/admin/discover-pins/reorder", { method: "POST", body });
}

export async function resetDiscoverPins(body) {
  requireApi();
  return apiFetch("/admin/discover-pins/reset", { method: "POST", body });
}

export async function updateDiscoverPin(id, body) {
  requireApi();
  return apiFetch(`/admin/discover-pins/${id}`, { method: "PATCH", body });
}

export async function deleteDiscoverPin(id) {
  requireApi();
  return apiFetch(`/admin/discover-pins/${id}`, { method: "DELETE" });
}

export async function adminSearchMovies(q, year) {
  requireApi();
  const params = new URLSearchParams({ q });
  if (year) params.set("year", String(year));
  return apiFetch(`/admin/movies/search?${params.toString()}`);
}

export async function listDiscoverExclusions(params = {}) {
  requireApi();
  const query = new URLSearchParams();
  if (params.region) query.set("region", params.region);
  if (params.listKind) query.set("listKind", params.listKind);
  if (params.genreId != null) query.set("genreId", String(params.genreId));
  const qs = query.toString();
  return apiFetch(`/admin/discover-exclusions${qs ? `?${qs}` : ""}`);
}

export async function createDiscoverExclusion(body) {
  requireApi();
  return apiFetch("/admin/discover-exclusions", { method: "POST", body });
}

export async function updateDiscoverExclusion(id, body) {
  requireApi();
  return apiFetch(`/admin/discover-exclusions/${id}`, { method: "PATCH", body });
}

export async function deleteDiscoverExclusion(id) {
  requireApi();
  return apiFetch(`/admin/discover-exclusions/${id}`, { method: "DELETE" });
}
