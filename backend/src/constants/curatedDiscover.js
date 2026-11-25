/**
 * Editorial pins for Discover — merged ON TOP of TMDB discover results.
 * Keep this file in sync with `frontend/src/constants/curatedDiscover.js`.
 *
 * For each entry, set `tmdbId` from themoviedb.org (number in the movie URL).
 * TMDB/DB fields are used by default; use `overrides` only to tweak copy you control.
 *
 * @example
 * {
 *   region: "IN",
 *   tab: "regional",          // "Your country" / regional trending
 *   entries: [{ tmdbId: 20453, position: 1 }],
 * },
 * {
 *   region: "IN",
 *   genreId: 28,              // Action tab
 *   entries: [{ tmdbId: 284054, position: 1, overrides: { overview: "Staff pick." } }],
 * }
 */

/** @type {Array<{ region: string, tab?: string, genreId?: number, entries: CuratedEntry[] }>} */
export const CURATED_DISCOVER_SLOTS = [
  {
    region: "GL",
    tab: "global",
    entries: [],
  },
  {
    region: "IN",
    tab: "regional",
    entries: [
      // { tmdbId: 20453, position: 1 },
    ],
  },
  {
    region: "IN",
    genreId: 28,
    entries: [
      // { tmdbId: 284054, position: 1 },
    ],
  },
];

/**
 * @typedef {object} CuratedEntry
 * @property {number} tmdbId — TMDB movie id (required)
 * @property {number} [position] — 1 = first in grid; lower numbers appear first
 * @property {object} [overrides] — optional fields layered on TMDB data (title, overview, etc.)
 */

export function findCuratedSlot(region, { tab, genreId } = {}) {
  const code = region?.toUpperCase();
  if (!code) return null;

  const forRegion = CURATED_DISCOVER_SLOTS.filter((slot) => slot.region === code);

  if (tab === "global" && code === "GL") {
    return forRegion.find((slot) => slot.tab === "global") ?? null;
  }

  if (genreId != null) {
    return forRegion.find((slot) => slot.genreId === Number(genreId)) ?? null;
  }

  if (tab) {
    return forRegion.find((slot) => slot.tab === tab && slot.genreId == null) ?? null;
  }

  return null;
}
