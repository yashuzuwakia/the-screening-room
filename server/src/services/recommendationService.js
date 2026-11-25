import { config } from "../config.js";
import { tmdbFetch } from "../lib/tmdb.js";
import { fromTmdbListItem } from "../utils/movieDto.js";
import { getMood } from "../constants/moods.js";
import { getPlatform } from "../constants/platforms.js";
import { getRuntimeOption } from "../constants/runtimes.js";
import { rankMovies } from "./recommendationEngine.js";
import { enrichMoviesFromDb } from "./movieSync.js";

const CANDIDATE_PAGES = [1, 2];
const THEATRICAL_WINDOW_DAYS = 60;

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

async function discoverPages(params) {
  const pages = await Promise.all(CANDIDATE_PAGES.map((page) => tmdbFetch("/discover/movie", { ...params, page })));
  const seen = new Set();
  return pages
    .flatMap((page) => page.results)
    .filter((m) => m.poster_path && !seen.has(m.id) && seen.add(m.id))
    .map(fromTmdbListItem);
}

async function fetchRemoteCandidates(prefs) {
  const mood = getMood(prefs.mood);
  const maxMinutes = getRuntimeOption(prefs.runtime)?.maxMinutes;
  const genreIds = prefs.genres.length ? prefs.genres : (mood?.genreIds ?? []);
  const wantsAny = prefs.platforms.includes("any");
  const theatersOnly = prefs.platforms.every((id) => id === "theaters");
  const providerIds = prefs.platforms.flatMap((id) => getPlatform(id)?.providerIds ?? []);

  const base = {
    sort_by: "popularity.desc",
    include_adult: false,
    with_genres: genreIds.join("|"),
    "with_runtime.gte": 60,
    "with_runtime.lte": maxMinutes ?? undefined,
    "vote_count.gte": 150,
    "vote_average.gte": 6,
  };

  if (theatersOnly) {
    Object.assign(base, {
      region: config.watchRegion,
      with_release_type: "3|2",
      "primary_release_date.gte": isoDaysAgo(THEATRICAL_WINDOW_DAYS),
      "vote_count.gte": 20,
    });
  }

  const providerFilter =
    !wantsAny && !theatersOnly && providerIds.length
      ? {
          with_watch_providers: providerIds.join("|"),
          watch_region: config.watchRegion,
          with_watch_monetization_types: "flatrate",
        }
      : null;

  let candidates = await discoverPages({ ...base, ...providerFilter });
  let platformFiltered = true;

  if (!candidates.length && providerFilter) {
    candidates = await discoverPages(base);
    platformFiltered = false;
  }

  return { candidates, context: { runtimeFiltered: true, platformFiltered } };
}

export async function getRecommendations(prefs) {
  const startedAt = Date.now();
  let candidates = [];
  let context = {};
  let source = "tmdb";

  try {
    ({ candidates, context } = await fetchRemoteCandidates(prefs));
  } catch (error) {
    console.warn("[recommendations]", error.message);
    source = "error";
  }

  candidates = await enrichMoviesFromDb(candidates);
  const results = rankMovies(candidates, prefs, context);

  return {
    results,
    candidateCount: candidates.length,
    source,
    elapsedMs: Date.now() - startedAt,
  };
}
