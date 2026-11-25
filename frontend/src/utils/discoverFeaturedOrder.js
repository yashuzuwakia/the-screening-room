import { sortDiscoverMovies } from "./discoverSort";

const FEATURED_MAX = 20;

/** Assign pinnedRank 1..max on the first rows; clear pin metadata further down. */
export function applyFeaturedPinRanks(movies, max = FEATURED_MAX) {
  return movies.map((m, i) => {
    if (i < max) return { ...m, pinnedRank: i + 1 };
    if (m.pinnedRank != null) {
      const rest = { ...m };
      delete rest.pinnedRank;
      return rest;
    }
    return m;
  });
}

/** Merge a saved featured order into the latest movie list from the API. */
export function mergeFeaturedOrder(movies, orderedIds, compare, max = FEATURED_MAX) {
  if (!movies?.length || !orderedIds?.length) {
    return sortDiscoverMovies(movies ?? [], compare);
  }

  const byId = new Map(movies.map((m) => [m.tmdbId ?? m.id, m]));
  const seen = new Set();
  const ordered = [];

  for (const id of orderedIds.slice(0, max)) {
    const movie = byId.get(id);
    if (!movie || seen.has(id)) continue;
    seen.add(id);
    ordered.push(movie);
  }

  for (const movie of movies) {
    const id = movie.tmdbId ?? movie.id;
    if (id == null || seen.has(id)) continue;
    ordered.push(movie);
  }

  return sortDiscoverMovies(applyFeaturedPinRanks(ordered, max), compare);
}
