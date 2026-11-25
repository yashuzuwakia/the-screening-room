/** Relevance, sort, and filter helpers for movie search (mirrors backend). */

export const SEARCH_SORTS = ["relevance", "popularity", "rating", "year"];

const SORT_LABELS = {
  relevance: "Best match",
  popularity: "Most popular",
  rating: "Highest rated",
  year: "Newest releases",
};

export const SEARCH_SORT_OPTIONS = SEARCH_SORTS.map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

function parseYear(movie) {
  const y = movie.year ?? movie.releaseDate?.slice(0, 4);
  const n = Number(y);
  return Number.isFinite(n) ? n : null;
}

export function filterSearchMovies(movies, { minRating, yearFrom, yearTo } = {}) {
  const min = minRating != null && minRating !== "" ? Number(minRating) : null;
  const from = yearFrom != null && yearFrom !== "" ? Number(yearFrom) : null;
  const to = yearTo != null && yearTo !== "" ? Number(yearTo) : null;

  return movies.filter((movie) => {
    if (min != null && Number.isFinite(min) && (movie.rating ?? 0) < min) return false;
    const year = parseYear(movie);
    if (from != null && Number.isFinite(from) && (year == null || year < from)) return false;
    if (to != null && Number.isFinite(to) && (year == null || year > to)) return false;
    return true;
  });
}

function relevanceScore(movie, query) {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const title = (movie.title ?? "").toLowerCase();
  const overview = (movie.overview ?? "").toLowerCase();

  let score = 0;
  if (!title) return score;
  if (title === q) score += 120;
  else if (title.startsWith(q)) score += 85;
  else if (tokens.length > 1 && tokens.every((t) => title.includes(t))) score += 65;
  else if (title.includes(q)) score += 40;
  else if (tokens.some((t) => title.includes(t))) score += 22;

  if (overview.includes(q)) score += 8;
  score += Math.min((movie.popularity ?? 0) / 25, 12);
  if (movie.rating != null) score += movie.rating * 0.8;
  if (movie.voteCount > 50) score += 2;
  return score;
}

export function rankSearchResults(movies, query) {
  return [...movies].sort((a, b) => {
    const diff = relevanceScore(b, query) - relevanceScore(a, query);
    if (diff !== 0) return diff;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
}

export function sortSearchMovies(movies, sortKey) {
  const key = SEARCH_SORTS.includes(sortKey) ? sortKey : "relevance";
  if (key === "relevance") return movies;

  return [...movies].sort((a, b) => {
    if (key === "popularity") return (b.popularity ?? 0) - (a.popularity ?? 0);
    if (key === "rating") return (b.rating ?? 0) - (a.rating ?? 0) || (b.voteCount ?? 0) - (a.voteCount ?? 0);
    if (key === "year") {
      const ya = parseYear(a) ?? 0;
      const yb = parseYear(b) ?? 0;
      return yb - ya;
    }
    return 0;
  });
}

export function applySearchOptions(movies, query, options = {}) {
  let next = filterSearchMovies(movies, options);
  const sort = options.sort ?? "relevance";
  if (sort === "relevance") next = rankSearchResults(next, query);
  else next = sortSearchMovies(next, sort);
  return next;
}

export function buildSearchQueryString({ q, sort, year, minRating, page }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort && sort !== "relevance") params.set("sort", sort);
  if (year) params.set("year", String(year));
  if (minRating) params.set("minRating", String(minRating));
  if (page && page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
