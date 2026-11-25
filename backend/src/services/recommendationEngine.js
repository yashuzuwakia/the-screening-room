import { getMood } from "../constants/moods.js";
import { getRuntimeOption } from "../constants/runtimes.js";
import { getGenreNames } from "../constants/genres.js";
import { communityVerdictFromScore } from "../constants/verdicts.js";

const WEIGHTS = { mood: 0.25, genre: 0.3, runtime: 0.1, platform: 0.1, quality: 0.18, popularity: 0.07 };
const FINAL_CUT = 10;
const PRIOR_VOTES = 1000;
const PRIOR_RATING = 6.5;

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const toPercent = (n) => Math.round(n * 100);
const wantsAnyPlatform = (platforms) => !platforms.length || platforms.includes("any");

function genreAffinity(movieGenres, targetGenres) {
  if (!targetGenres.length) return 1;
  const hits = targetGenres.filter((g) => movieGenres.includes(g)).length;
  if (!hits) return 0.15;
  return clamp01(0.7 + 0.3 * (hits / Math.min(targetGenres.length, 2)));
}

function runtimeFit(runtime, maxMinutes, runtimeFiltered) {
  if (!maxMinutes) return 1;
  if (!runtime) return runtimeFiltered ? 1 : 0.7;
  if (runtime <= maxMinutes) return 1;
  return clamp01(1 - (runtime - maxMinutes) / 60);
}

function platformFit(movie, platforms, platformFiltered) {
  if (wantsAnyPlatform(platforms) || platformFiltered) return 1;
  return 0.7;
}

export function scoreMovie(movie, prefs, { runtimeFiltered = false, platformFiltered = false, random = Math.random } = {}) {
  const mood = getMood(prefs.mood);
  const maxMinutes = getRuntimeOption(prefs.runtime)?.maxMinutes;

  const breakdown = {
    mood: mood?.genreIds.length ? genreAffinity(movie.genreIds, mood.genreIds) : 0.75 + random() * 0.25,
    genre: genreAffinity(movie.genreIds, prefs.genres),
    runtime: runtimeFit(movie.runtime, maxMinutes, runtimeFiltered),
    platform: platformFit(movie, prefs.platforms, platformFiltered && !movie.platformFilterRelaxed),
  };

  const votes = movie.voteCount;
  let weightedRating = movie.rating ?? PRIOR_RATING;
  if (movie.rating != null && votes != null) {
    weightedRating = (votes * movie.rating + PRIOR_VOTES * PRIOR_RATING) / (votes + PRIOR_VOTES);
  }
  if (movie.communityRating != null && movie.communityCount > 0) {
    weightedRating = weightedRating * 0.7 + movie.communityRating * 0.3;
  }

  const quality = clamp01((weightedRating - 5) / 3.5);
  const popularity = clamp01(Math.log10((movie.popularity ?? 0) + 1) / 3);

  const score =
    breakdown.mood * WEIGHTS.mood +
    breakdown.genre * WEIGHTS.genre +
    breakdown.runtime * WEIGHTS.runtime +
    breakdown.platform * WEIGHTS.platform +
    quality * WEIGHTS.quality +
    popularity * WEIGHTS.popularity;

  return {
    ...movie,
    score,
    match: toPercent(score),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, toPercent(v)])),
  };
}

export function rankMovies(movies, prefs, context) {
  return movies
    .map((movie) => scoreMovie(movie, prefs, context))
    .sort((a, b) => b.score - a.score)
    .slice(0, FINAL_CUT);
}

export function explainMatch(movie, prefs) {
  const mood = getMood(prefs.mood);
  const matched = getGenreNames(movie.genreIds.filter((g) => prefs.genres.includes(g)));
  const opener =
    mood && mood.id !== "surprise" ? `You wanted something ${mood.adjective}` : "You asked us to surprise you";
  let text = matched.length
    ? `${opener}, and ${movie.title} fits as a ${matched.join(", ").toLowerCase()} pick.`
    : `${opener}, and ${movie.title} is the strongest overall fit we found.`;
  if (movie.communityRating != null && movie.communityCount > 0) {
    const verdict = communityVerdictFromScore(movie.communityRating);
    text += ` Community members mostly call it ${verdict} (${movie.communityCount} verdicts).`;
  } else if (movie.rating) {
    text += ` TMDB rating: ${movie.rating}/10.`;
  }
  return text;
}
