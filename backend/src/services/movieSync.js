import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { tmdbFetch, tmdbImage } from "../lib/tmdb.js";
import { mapStreamingProviders } from "../utils/streamingLinks.js";
import { fromDbMovie, fromTmdbListItem, toDbMovieFields } from "../utils/movieDto.js";
import { genreDiscoverQuery, regionalDiscoverQuery } from "../constants/regionalDiscover.js";
import { applySearchOptions, rankSearchResults } from "../utils/movieSearch.js";
import { GLOBAL_DISCOVER_REGION } from "../constants/discoverCuration.js";
import { mergeCuratedDiscover } from "./curatedMovies.js";

const STALE_MS = config.movieStaleDays * 24 * 60 * 60 * 1000;

export async function upsertMovieFromTmdb(tmdbId) {
  const data = await tmdbFetch(`/movie/${tmdbId}`, {
    append_to_response: "credits,videos",
  });

  const fields = toDbMovieFields(data);
  return prisma.movie.upsert({
    where: { tmdbId },
    create: fields,
    update: { ...fields, syncedAt: new Date() },
  });
}

export async function ensureMoviesSynced(tmdbIds) {
  const unique = [...new Set(tmdbIds)];
  if (!unique.length) return;

  const existing = await prisma.movie.findMany({
    where: { tmdbId: { in: unique } },
    select: { tmdbId: true, syncedAt: true },
  });
  const byId = Object.fromEntries(existing.map((m) => [m.tmdbId, m]));

  const stale = unique.filter((id) => {
    const row = byId[id];
    if (!row) return true;
    return Date.now() - row.syncedAt.getTime() > STALE_MS;
  });

  await Promise.all(stale.slice(0, 25).map((id) => upsertMovieFromTmdb(id).catch((e) => console.warn("sync", id, e.message))));
}

export async function enrichMoviesFromDb(movies) {
  const ids = movies.map((m) => m.tmdbId ?? m.id);
  await ensureMoviesSynced(ids);
  const rows = await prisma.movie.findMany({ where: { tmdbId: { in: ids } } });
  const byTmdb = Object.fromEntries(rows.map((r) => [r.tmdbId, r]));
  return movies.map((m) => {
    const row = byTmdb[m.tmdbId ?? m.id];
    const base = row ? fromDbMovie(row) : m;
    if (m.platformFilterRelaxed) return { ...base, platformFilterRelaxed: true };
    if (m.pinnedRank != null) return { ...base, pinnedRank: m.pinnedRank };
    return base;
  });
}

export async function getMovieDetails(tmdbId, watchRegion) {
  const row = await prisma.movie.findUnique({ where: { tmdbId } });
  const stale = !row || Date.now() - row.syncedAt.getTime() > STALE_MS;
  const dbRow = stale ? await upsertMovieFromTmdb(tmdbId) : row;

  const data = await tmdbFetch(`/movie/${tmdbId}`, {
    append_to_response: "credits,videos,watch/providers,recommendations",
  });

  const trailer =
    data.videos?.results?.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    data.videos?.results?.find((v) => v.site === "YouTube");

  const regionCode = normalizeRegion(watchRegion, config.watchRegion);
  const region = data["watch/providers"]?.results?.[regionCode];
  const providers = mapStreamingProviders(
    { flatrate: region?.flatrate ?? [], title: data.title, region: regionCode },
    (path) => tmdbImage(path, "w92"),
  );

  const similar = (data.recommendations?.results ?? [])
    .filter((m) => m.poster_path)
    .slice(0, 12)
    .map(fromTmdbListItem);

  await ensureMoviesSynced(similar.map((m) => m.id));
  const enrichedSimilar = await enrichMoviesFromDb(similar);

  const base = fromDbMovie(dbRow);
  return {
    ...base,
    tagline: data.tagline ?? "",
    director: data.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
    cast: (data.credits?.cast ?? []).slice(0, 6).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      photoUrl: tmdbImage(c.profile_path, "w185"),
    })),
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    providers,
    watchRegion: regionCode,
    similar: enrichedSimilar,
  };
}

function normalizeRegion(region, fallback) {
  const code = (region || fallback || "US").toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : fallback || "US";
}

/** Worldwide TMDB popular — same list for every country (Home / Discover trending). */
export async function listGlobalPopular() {
  const data = await tmdbFetch("/movie/popular", { page: 1 });
  const movies = data.results.filter((m) => m.poster_path).map(fromTmdbListItem);
  const merged = await mergeCuratedDiscover(movies, GLOBAL_DISCOVER_REGION, { tab: "global" });
  return enrichMoviesFromDb(merged);
}

async function discoverMoviesForRegion(discoverParams, { limit = 40, pages = 3 } = {}) {
  const pageNums = Array.from({ length: pages }, (_, i) => i + 1);
  const responses = await Promise.all(
    pageNums.map((page) => tmdbFetch("/discover/movie", { ...discoverParams, page })),
  );
  const seen = new Set();
  const movies = [];
  for (const data of responses) {
    for (const raw of data.results ?? []) {
      if (!raw.poster_path || seen.has(raw.id)) continue;
      seen.add(raw.id);
      movies.push(fromTmdbListItem(raw));
      if (movies.length >= limit) return movies;
    }
  }
  return movies;
}

/** Popular picks for a country — TMDB discover (not global /movie/popular alone). */
export async function listTrending(region) {
  const resolved = normalizeRegion(region, config.watchRegion);
  const discoverParams = regionalDiscoverQuery(resolved);
  if (!discoverParams) {
    const data = await tmdbFetch("/movie/popular", { region: resolved, page: 1 });
    const movies = (data.results ?? [])
      .filter((m) => m.poster_path)
      .slice(0, 40)
      .map(fromTmdbListItem);
    return enrichMoviesFromDb(movies);
  }
  const movies = await discoverMoviesForRegion(discoverParams);
  const merged = await mergeCuratedDiscover(movies, resolved, { tab: "regional" });
  return enrichMoviesFromDb(merged);
}

function emptySearchResult(query) {
  return {
    movies: [],
    query,
    page: 1,
    totalResults: 0,
    totalPages: 0,
    hasMore: false,
  };
}

function parseSearchOptions(options = {}) {
  const page = Math.min(Math.max(Number(options.page) || 1, 1), 40);
  const year = options.year != null && options.year !== "" ? Number(options.year) : null;
  const minRating =
    options.minRating != null && options.minRating !== "" ? Number(options.minRating) : null;
  const sort = typeof options.sort === "string" ? options.sort : "relevance";
  const region =
    typeof options.region === "string" && /^[A-Za-z]{2}$/.test(options.region)
      ? options.region.toUpperCase()
      : null;
  return {
    page,
    year: Number.isFinite(year) ? year : null,
    minRating: Number.isFinite(minRating) ? minRating : null,
    sort,
    region,
  };
}

export async function searchMovies(query, options = {}) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return emptySearchResult(q);

  const parsed = parseSearchOptions(options);
  const tmdbParams = {
    query: q,
    page: parsed.page,
    include_adult: false,
  };
  if (parsed.year) tmdbParams.year = parsed.year;
  if (parsed.region) tmdbParams.region = parsed.region;

  const data = await tmdbFetch("/search/movie", tmdbParams);
  const raw = (data.results ?? []).filter((m) => m.poster_path).map(fromTmdbListItem);

  const ranked = applySearchOptions(raw, q, {
    sort: parsed.sort,
    minRating: parsed.minRating,
    yearFrom: parsed.year ?? undefined,
    yearTo: parsed.year ?? undefined,
  });

  const movies = await enrichMoviesFromDb(ranked);

  return {
    movies,
    query: q,
    page: data.page ?? parsed.page,
    totalResults: data.total_results ?? movies.length,
    totalPages: data.total_pages ?? 1,
    hasMore: (data.page ?? parsed.page) < (data.total_pages ?? parsed.page),
    sort: parsed.sort,
    year: parsed.year,
    minRating: parsed.minRating,
  };
}

/** Fast typeahead — no DB enrich, relevance-ranked. */
export async function suggestMovies(query, limit = 8) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return { suggestions: [], query: q };

  const data = await tmdbFetch("/search/movie", {
    query: q,
    page: 1,
    include_adult: false,
  });

  const suggestions = rankSearchResults(
    (data.results ?? []).filter((m) => m.poster_path).map(fromTmdbListItem),
    q,
  ).slice(0, Math.min(limit, 12));

  return { suggestions, query: q };
}

export async function listByGenre(genreId, region) {
  const resolved = normalizeRegion(region, config.watchRegion);
  const params = genreDiscoverQuery(resolved, genreId);
  const movies = await discoverMoviesForRegion(params);
  const merged = await mergeCuratedDiscover(movies, resolved, { genreId });
  return enrichMoviesFromDb(merged);
}
