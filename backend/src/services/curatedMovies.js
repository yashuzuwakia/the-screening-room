import { findCuratedSlot } from "../constants/curatedDiscover.js";
import { listActivePinEntries } from "./discoverPinService.js";
import { listActiveExcludedTmdbIds } from "./discoverExclusionService.js";
import { tmdbFetch } from "../lib/tmdb.js";
import { fromDbMovie, fromTmdbListItem, toDbMovieFields } from "../utils/movieDto.js";
import { prisma } from "../lib/prisma.js";

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

  const row = await prisma.movie.findUnique({ where: { tmdbId: id } });
  if (row) return fromDbMovie(row);

  try {
    const data = await tmdbFetch(`/movie/${id}`);
    if (!data?.poster_path && !data?.backdrop_path) return null;
    const fields = toDbMovieFields(data);
    const saved = await prisma.movie.upsert({
      where: { tmdbId: id },
      create: fields,
      update: { ...fields, syncedAt: new Date() },
    });
    return fromDbMovie(saved);
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

/**
 * Pins curated movies first, then TMDB discover results (no duplicates).
 */
async function collectCuratedEntries(region, context) {
  const staticSlot = findCuratedSlot(region, context);
  const dbEntries = await listActivePinEntries(region, context);
  const combined = [...dbEntries, ...(staticSlot?.entries ?? [])];
  const seen = new Set();
  return combined.filter((entry) => {
    if (!entry?.tmdbId || seen.has(entry.tmdbId)) return false;
    seen.add(entry.tmdbId);
    return true;
  });
}

export async function mergeCuratedDiscover(baseMovies, region, context = {}) {
  const entries = await collectCuratedEntries(region, context);
  if (!entries.length) return baseMovies;

  const curated = await resolveCuratedEntries(entries);
  if (!curated.length) return baseMovies;

  const used = new Set();
  const merged = [];

  for (const movie of curated) {
    const id = movie.tmdbId ?? movie.id;
    if (id == null || used.has(id)) continue;
    used.add(id);
    merged.push(movie);
  }

  for (const movie of baseMovies) {
    const id = movie.tmdbId ?? movie.id;
    if (id == null || used.has(id)) continue;
    used.add(id);
    merged.push(movie);
  }

  const excluded = await listActiveExcludedTmdbIds(region, context);
  if (!excluded.size) return merged;

  return merged.filter((movie) => {
    const id = movie.tmdbId ?? movie.id;
    return id == null || !excluded.has(Number(id));
  });
}
