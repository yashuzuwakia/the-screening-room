import { tmdbFetch, isTmdbConfigured } from "./tmdbClient";
import { normalizeMovie, normalizeMovieDetails } from "./normalize";
import { fallbackMovies } from "../data/fallbackMovies";
import { apiFetch, isApiMode } from "./apiClient.js";
import { WATCH_REGION } from "../constants/platforms.js";
import { encodeVerdictReview, getVerdict } from "../constants/verdicts.js";
import { genreDiscoverQuery, regionalDiscoverQuery } from "../constants/regionalDiscover.js";
import { providerWatchUrl } from "../utils/streamingLinks.js";
import { applySearchOptions, rankSearchResults } from "../utils/movieSearch.js";
import { mergeCuratedDiscover } from "../utils/curatedMovies.js";

const byPopularity = (a, b) => b.popularity - a.popularity;

async function withFallback(remote, local) {
  if (!isTmdbConfigured) return local();
  try {
    return await remote();
  } catch (error) {
    console.warn("[movieService] TMDB unavailable, using offline catalog.", error);
    return local();
  }
}

const withPosters = (results) => results.filter((m) => m.poster_path).map(normalizeMovie);

async function preferApi(apiCall, clientFallback) {
  if (!isApiMode()) return clientFallback();
  try {
    return await apiCall();
  } catch (error) {
    console.warn("[movieService] API unavailable, using TMDB in the browser.", error);
    return clientFallback();
  }
}

async function discoverFromClient(discoverParams, limit = 40) {
  const pages = await Promise.all([
    tmdbFetch("/discover/movie", { ...discoverParams, page: 1 }),
    tmdbFetch("/discover/movie", { ...discoverParams, page: 2 }),
    tmdbFetch("/discover/movie", { ...discoverParams, page: 3 }),
  ]);
  const seen = new Set();
  const merged = [];
  for (const page of pages) {
    for (const movie of page.results ?? []) {
      if (!movie.poster_path || seen.has(movie.id)) continue;
      seen.add(movie.id);
      merged.push(movie);
      if (merged.length >= limit) break;
    }
    if (merged.length >= limit) break;
  }
  return withPosters(merged);
}

async function trendingFromClient(region) {
  const resolved = region?.toUpperCase() || "US";
  const discoverParams = regionalDiscoverQuery(resolved);
  if (!discoverParams) {
    const base = withPosters((await tmdbFetch("/movie/popular", { region: resolved, page: 1 })).results).slice(
      0,
      40,
    );
    return mergeCuratedDiscover(base, resolved, { tab: "regional" });
  }
  const base = await discoverFromClient(discoverParams);
  return mergeCuratedDiscover(base, resolved, { tab: "regional" });
}

async function byGenreFromClient(genreId, region) {
  const resolved = region?.toUpperCase() || "US";
  const params = genreDiscoverQuery(resolved, genreId);
  return withFallback(
    async () => {
      const base = await discoverFromClient(params);
      return mergeCuratedDiscover(base, resolved, { genreId });
    },
    async () => {
      const base = fallbackMovies.filter((m) => m.genreIds.includes(genreId)).sort(byPopularity);
      return mergeCuratedDiscover(base, resolved, { genreId });
    },
  );
}

function globalPopularFromClient() {
  return withFallback(
    async () => withPosters((await tmdbFetch("/movie/popular", { page: 1 })).results),
    () => [...fallbackMovies].sort(byPopularity),
  );
}

/** Same popular list everywhere — not tied to profile country. */
export function getGlobalPopularMovies() {
  return preferApi(
    () => apiFetch("/movies/trending?scope=global", { auth: false }).then((data) => data.movies),
    () => globalPopularFromClient(),
  );
}

export function getTrendingMovies(region) {
  const code = (region || WATCH_REGION).toUpperCase();
  const query = `?region=${encodeURIComponent(code)}`;
  return preferApi(
    () => apiFetch(`/movies/trending${query}`, { auth: false }).then((data) => data.movies),
    () =>
      withFallback(
        () => trendingFromClient(region),
        () => [...fallbackMovies].sort(byPopularity),
      ),
  );
}

const EMPTY_SEARCH = {
  movies: [],
  query: "",
  page: 1,
  totalResults: 0,
  totalPages: 0,
  hasMore: false,
};

function localSearchFallback(query, options = {}) {
  const q = query.trim();
  const needle = q.toLowerCase();
  const page = Math.max(Number(options.page) || 1, 1);
  const matched = fallbackMovies.filter(
    (m) =>
      m.title.toLowerCase().includes(needle) ||
      (m.overview && m.overview.toLowerCase().includes(needle)),
  );
  const filtered = applySearchOptions(matched, q, options);
  const pageSize = 20;
  const start = (page - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  return {
    movies: slice,
    query: q,
    page,
    totalResults: filtered.length,
    totalPages,
    hasMore: page < totalPages,
    sort: options.sort ?? "relevance",
    year: options.year ?? null,
    minRating: options.minRating ?? null,
  };
}

async function searchFromClient(query, options = {}) {
  const q = query.trim();
  if (q.length < 2) return { ...EMPTY_SEARCH, query: q };

  const page = Math.max(Number(options.page) || 1, 1);
  const tmdbParams = { query: q, page, include_adult: false };
  if (options.year) tmdbParams.year = Number(options.year);
  if (options.region) tmdbParams.region = String(options.region).toUpperCase();

  return withFallback(
    async () => {
      const data = await tmdbFetch("/search/movie", tmdbParams);
      const raw = withPosters(data.results ?? []);
      const movies = applySearchOptions(raw, q, options);
      return {
        movies,
        query: q,
        page: data.page ?? page,
        totalResults: data.total_results ?? movies.length,
        totalPages: data.total_pages ?? 1,
        hasMore: (data.page ?? page) < (data.total_pages ?? page),
        sort: options.sort ?? "relevance",
        year: options.year ?? null,
        minRating: options.minRating ?? null,
      };
    },
    () => localSearchFallback(q, options),
  );
}

async function suggestFromClient(query, limit = 8) {
  const q = query.trim();
  if (q.length < 2) return { suggestions: [], query: q };
  return withFallback(
    async () => {
      const data = await tmdbFetch("/search/movie", { query: q, page: 1, include_adult: false });
      const suggestions = rankSearchResults(withPosters(data.results ?? []), q).slice(0, limit);
      return { suggestions, query: q };
    },
    () => {
      const needle = q.toLowerCase();
      const suggestions = rankSearchResults(
        fallbackMovies.filter((m) => m.title.toLowerCase().includes(needle)),
        q,
      ).slice(0, limit);
      return { suggestions, query: q };
    },
  );
}

function searchQueryParams(query, options = {}) {
  const params = new URLSearchParams({ q: query.trim() });
  if (options.page) params.set("page", String(options.page));
  if (options.sort && options.sort !== "relevance") params.set("sort", options.sort);
  if (options.year) params.set("year", String(options.year));
  if (options.minRating) params.set("minRating", String(options.minRating));
  if (options.region) params.set("region", String(options.region).toUpperCase());
  return params.toString();
}

export function searchMovies(query, options = {}) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return Promise.resolve({ ...EMPTY_SEARCH, query: q });
  return preferApi(
    () => apiFetch(`/movies/search?${searchQueryParams(q, options)}`, { auth: false }),
    () => searchFromClient(q, options),
  );
}

export function suggestMovies(query, limit = 8) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return Promise.resolve({ suggestions: [], query: q });
  return preferApi(
    () =>
      apiFetch(`/movies/search/suggest?q=${encodeURIComponent(q)}&limit=${limit}`, { auth: false }),
    () => suggestFromClient(q, limit),
  );
}

export function getMoviesByGenre(genreId, region) {
  const code = (region || WATCH_REGION).toUpperCase();
  return preferApi(
    () =>
      apiFetch(`/movies/discover?genreId=${genreId}&region=${encodeURIComponent(code)}`, { auth: false }).then(
        (data) => data.movies,
      ),
    () => byGenreFromClient(genreId, region),
  );
}

function localDetails(id, watchRegion = WATCH_REGION) {
  const movie = fallbackMovies.find((m) => String(m.id) === String(id));
  if (!movie) return null;
  return {
    ...movie,
    availabilitySource: "offline",
    tagline: "",
    director: null,
    cast: [],
    trailerUrl: null,
    providers: movie.platform
      ? [
          {
            id: movie.platform,
            name: movie.platform,
            logoUrl: null,
            url: providerWatchUrl({
              providerId: 0,
              providerName: movie.platform,
              title: movie.title,
              region: watchRegion,
            }),
          },
        ]
      : [],
    similar: fallbackMovies
      .filter((m) => m.id !== movie.id && m.genreIds.some((g) => movie.genreIds.includes(g)))
      .slice(0, 12),
  };
}

function detailsFromClient(id, watchRegion) {
  const local = () => {
    const details = localDetails(id, watchRegion);
    if (!details) throw new Error("We couldn't find that movie.");
    return details;
  };
  return withFallback(async () => {
    const data = await tmdbFetch(`/movie/${id}`, {
      append_to_response: "credits,videos,watch/providers,recommendations",
    });
    return normalizeMovieDetails(data, watchRegion);
  }, local);
}

export async function getMovieDetails(id, watchRegion) {
  const regionQuery = watchRegion ? `?region=${encodeURIComponent(watchRegion)}` : "";
  return preferApi(async () => {
    const data = await apiFetch(`/movies/${id}${regionQuery}`);
    return { ...data.movie, userRating: data.userRating };
  }, () => detailsFromClient(id, watchRegion));
}

export async function submitMovieVerdict(tmdbId, verdictId) {
  const verdict = getVerdict(verdictId);
  if (!verdict) throw new Error("Invalid verdict");
  return apiFetch(`/movies/${tmdbId}/rating`, {
    method: "PUT",
    body: { score: verdict.score, review: encodeVerdictReview(verdictId) },
  });
}

export async function submitMovieRating(tmdbId, score, review) {
  return apiFetch(`/movies/${tmdbId}/rating`, {
    method: "PUT",
    body: { score, review: review ?? null },
  });
}

export async function deleteMovieRating(tmdbId) {
  return apiFetch(`/movies/${tmdbId}/rating`, { method: "DELETE" });
}
