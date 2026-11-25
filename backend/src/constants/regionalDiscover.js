/** Extra TMDB discover params so “popular in {country}” is not just global Hollywood. */

const IN_LANGUAGES = "hi|ta|te|ml|kn|mr|bn";

export function regionalDiscoverQuery(region) {
  const code = region?.toUpperCase();
  if (!code) return null;

  if (code === "IN") {
    return {
      region: "IN",
      with_original_language: IN_LANGUAGES,
      include_adult: false,
      sort_by: "popularity.desc",
      "vote_count.gte": 5,
    };
  }

  if (code === "US") {
    return {
      region: "US",
      with_origin_country: "US",
      include_adult: false,
      sort_by: "popularity.desc",
      "vote_count.gte": 20,
    };
  }

  return {
    region: code,
    with_origin_country: code,
    include_adult: false,
    sort_by: "popularity.desc",
    "vote_count.gte": 10,
  };
}

export function genreDiscoverQuery(region, genreId) {
  const code = region?.toUpperCase() || "US";
  const regional = regionalDiscoverQuery(code);
  const genreParams = {
    with_genres: String(genreId),
    sort_by: "popularity.desc",
    include_adult: false,
  };
  return { ...regional, ...genreParams };
}

/** Bias discover/match candidates toward the viewer's country when set. */
export function applyRegionalDiscover(base, region) {
  const regional = regionalDiscoverQuery(region?.toUpperCase());
  if (!regional) return { ...base, region: region?.toUpperCase() || "US" };
  return { ...base, ...regional };
}

export function mergeTmdbMoviePages(pages, { localFirst = true } = {}) {
  const popular = pages[0]?.results ?? [];
  const regional = pages.slice(1).flatMap((page) => page?.results ?? []);
  const primary = localFirst ? [regional, popular] : [popular, regional];
  const seen = new Set();
  const merged = [];

  for (const list of primary) {
    for (const movie of list) {
      if (!movie?.poster_path || seen.has(movie.id)) continue;
      seen.add(movie.id);
      merged.push(movie);
    }
  }

  return merged;
}
