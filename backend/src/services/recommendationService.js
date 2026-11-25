import { config } from "../config.js";
import { tmdbFetch } from "../lib/tmdb.js";
import { fromTmdbListItem } from "../utils/movieDto.js";
import { getMood } from "../constants/moods.js";
import { getPlatform } from "../constants/platforms.js";
import { getRuntimeOption } from "../constants/runtimes.js";
import { rankMovies } from "./recommendationEngine.js";
import { enrichMoviesFromDb } from "./movieSync.js";
import { applyRegionalDiscover } from "../constants/regionalDiscover.js";

const CANDIDATE_PAGES = [1, 2];
const EXTRA_CANDIDATE_PAGES = [3, 4, 5];
const DEEP_CANDIDATE_PAGES = [6, 7];
const THEATRICAL_WINDOW_DAYS = 60;

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

async function discoverPages(params, pageNumbers = CANDIDATE_PAGES) {
  const pages = await Promise.all(pageNumbers.map((page) => tmdbFetch("/discover/movie", { ...params, page })));
  const seen = new Set();
  return pages
    .flatMap((page) => page.results)
    .filter((m) => m.poster_path && !seen.has(m.id) && seen.add(m.id))
    .map(fromTmdbListItem);
}

function withoutExcluded(movies, excludeIds) {
  if (!excludeIds?.length) return movies;
  const blocked = new Set(excludeIds.map(Number));
  return movies.filter((m) => !blocked.has(m.id));
}

async function fetchRemoteCandidates(prefs, pageNumbers = CANDIDATE_PAGES) {
  const watchRegion = (prefs.watchRegion || config.watchRegion || "US").toUpperCase();
  const mood = getMood(prefs.mood);
  const maxMinutes = getRuntimeOption(prefs.runtime)?.maxMinutes;
  const genreIds = prefs.genres.length ? prefs.genres : (mood?.genreIds ?? []);
  const wantsAny = prefs.platforms.includes("any");
  const theatersOnly = prefs.platforms.every((id) => id === "theaters");
  const providerIds = prefs.platforms.flatMap((id) => getPlatform(id)?.providerIds ?? []);

  const discoverQuery = {
    sort_by: "popularity.desc",
    include_adult: false,
    "with_runtime.gte": 60,
    "with_runtime.lte": maxMinutes ?? undefined,
    "vote_count.gte": 150,
    "vote_average.gte": 6,
  };
  if (genreIds.length) discoverQuery.with_genres = genreIds.join("|");

  const base = applyRegionalDiscover(discoverQuery, watchRegion);

  if (theatersOnly) {
    Object.assign(base, {
      region: watchRegion,
      with_release_type: "3|2",
      "primary_release_date.gte": isoDaysAgo(THEATRICAL_WINDOW_DAYS),
      "vote_count.gte": 20,
    });
  }

  const providerFilter =
    !wantsAny && !theatersOnly && providerIds.length
      ? {
          with_watch_providers: providerIds.join("|"),
          watch_region: watchRegion,
          with_watch_monetization_types: "flatrate",
        }
      : null;

  let candidates = await discoverPages({ ...base, ...providerFilter }, pageNumbers);

  if (!candidates.length && providerFilter) {
    candidates = (await discoverPages(base, pageNumbers)).map((movie) => ({ ...movie, platformFilterRelaxed: true }));
  }

  return { candidates, context: { runtimeFiltered: true, platformFiltered: true } };
}

/** Wizard recommendations; with excludeIds we page deeper into TMDB discover until we have fresh titles. */
export async function getRecommendations(prefs) {
  const startedAt = Date.now();
  const excludeIds = prefs.excludeIds ?? [];
  let candidates = [];
  let context = {};
  let source = "tmdb";
  let exhausted = false;

  const pageSets =
    excludeIds.length > 0 ? [CANDIDATE_PAGES, EXTRA_CANDIDATE_PAGES, DEEP_CANDIDATE_PAGES] : [CANDIDATE_PAGES];

  try {
    for (let i = 0; i < pageSets.length; i += 1) {
      const batch = await fetchRemoteCandidates(prefs, pageSets[i]);
      const merged = i === 0 ? batch.candidates : [...candidates, ...batch.candidates];
      const seen = new Set();
      candidates = merged.filter((m) => !seen.has(m.id) && seen.add(m.id));
      context = batch.context;
      candidates = withoutExcluded(candidates, excludeIds);
      const preview = rankMovies(candidates, prefs, context);
      if (preview.length >= 3 || i === pageSets.length - 1) {
        exhausted = i === pageSets.length - 1 && preview.length === 0;
        break;
      }
    }
  } catch (error) {
    console.warn("[recommendations]", error.message);
    source = "error";
  }

  candidates = await enrichMoviesFromDb(candidates);
  const results = rankMovies(withoutExcluded(candidates, excludeIds), prefs, context);

  return {
    results,
    candidateCount: candidates.length,
    source,
    elapsedMs: Date.now() - startedAt,
    exhausted: exhausted && results.length === 0,
  };
}
