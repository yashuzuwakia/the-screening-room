import { findCuratedSlot } from "../constants/curatedDiscover.js";
import { tmdbFetch, isTmdbConfigured } from "../services/tmdbClient.js";
import { normalizeMovie } from "../services/normalize.js";
import { fallbackMovies } from "../data/fallbackMovies.js";

function applyOverrides(movie, entry) {
  const patch = entry?.overrides;
  if (!patch || typeof patch !== "object") return movie;
  const next = { ...movie };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && value !== null && value !== "") {
      next[key] = value;
    }
  }
  return next;
}

async function movieFromTmdbId(tmdbId) {
  const id = Number(tmdbId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const offline = fallbackMovies.find((m) => m.id === id);
  if (offline) return { ...offline };

  if (!isTmdbConfigured) return null;

  try {
    const data = await tmdbFetch(`/movie/${id}`);
    if (!data?.poster_path && !data?.backdrop_path) return null;
    return normalizeMovie(data);
  } catch {
    return null;
  }
}

async function resolveCuratedEntries(entries = []) {
  const sorted = [...entries].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  const resolved = [];
  for (const entry of sorted) {
    if (!entry?.tmdbId) continue;
    const movie = await movieFromTmdbId(entry.tmdbId);
    if (!movie) continue;
    const rank = entry.position != null ? Number(entry.position) : null;
    resolved.push({
      ...applyOverrides(movie, entry),
      ...(Number.isFinite(rank) && rank > 0 ? { pinnedRank: rank } : {}),
    });
  }
  return resolved;
}

export async function mergeCuratedDiscover(baseMovies, region, context = {}) {
  const slot = findCuratedSlot(region, context);
  if (!slot?.entries?.length) return baseMovies;

  const curated = await resolveCuratedEntries(slot.entries);
  if (!curated.length) return baseMovies;

  const used = new Set();
  const merged = [];

  for (const movie of curated) {
    const id = movie.id;
    if (id == null || used.has(id)) continue;
    used.add(id);
    merged.push(movie);
  }

  for (const movie of baseMovies) {
    if (movie.id == null || used.has(movie.id)) continue;
    used.add(movie.id);
    merged.push(movie);
  }

  return merged;
}
