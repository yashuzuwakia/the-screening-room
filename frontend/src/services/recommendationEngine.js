// Pure scoring logic: no network access, so it can be reused on the server or in tests.
import { getMood } from "../constants/moods";
import { communityVerdictForMovie } from "../constants/verdicts.js";
import { getRuntimeOption } from "../constants/runtimes";
import { getPlatform, getPlatformByName } from "../constants/platforms";
import { getGenreNames } from "../constants/genres";
import { formatCompact, formatList, formatRating, formatRuntime } from "../utils/format";

const WEIGHTS = { mood: 0.25, genre: 0.3, runtime: 0.1, platform: 0.1, quality: 0.18, popularity: 0.07 };
const FINAL_CUT = 10;
// Bayesian prior: ratings backed by few votes are pulled toward an average film.
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
  if (!movie.platform) return 0.5;
  return platforms.includes(getPlatformByName(movie.platform)?.id) ? 1 : 0.3;
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
  if (movie.rating && votes != null) {
    weightedRating = (votes * movie.rating + PRIOR_VOTES * PRIOR_RATING) / (votes + PRIOR_VOTES);
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

// Hard filter for the offline catalog; the TMDB path filters server-side via query params.
export function filterCandidates(movies, prefs) {
  const mood = getMood(prefs.mood);
  const wanted = new Set([...prefs.genres, ...(mood?.genreIds ?? [])]);
  const maxMinutes = getRuntimeOption(prefs.runtime)?.maxMinutes;

  const withinRuntime = movies.filter((movie) => !maxMinutes || (movie.runtime && movie.runtime <= maxMinutes));
  const strict = withinRuntime.filter((movie) => movie.genreIds.some((id) => wanted.has(id)));
  return strict.length ? strict : withinRuntime;
}

export function explainMatch(movie, prefs, details) {
  const mood = getMood(prefs.mood);
  const matchedGenres = getGenreNames(movie.genreIds.filter((g) => prefs.genres.includes(g)));
  const maxMinutes = getRuntimeOption(prefs.runtime)?.maxMinutes;
  const runtime = details?.runtime ?? movie.runtime;
  const director = details?.director;
  const sentences = [];

  const opener = mood && mood.id !== "surprise" ? `You wanted something ${mood.adjective}` : "You asked us to surprise you";
  sentences.push(
    matchedGenres.length
      ? `${opener}, and ${movie.title} delivers as a ${formatList(matchedGenres).toLowerCase()} pick.`
      : `${opener}, and ${movie.title} is the strongest overall fit we found.`,
  );

  const crowdVerdict = communityVerdictForMovie(movie);
  if (crowdVerdict) {
    sentences.push(
      `Community members mostly call it ${crowdVerdict.label.toLowerCase()} (${movie.communityCount} verdicts).`,
    );
  } else if (movie.rating) {
    const audience = movie.voteCount >= 1000 ? ` from ${formatCompact(movie.voteCount)} viewers` : "";
    const credit = director ? `, directed by ${director}` : "";
    const rating = formatRating(movie.rating);
    const article = rating.startsWith("8") ? "an" : "a";
    sentences.push(`It holds ${article} ${rating}/10 TMDB rating${audience}${credit}.`);
  }

  if (runtime && maxMinutes && runtime <= maxMinutes) {
    sentences.push(`At ${formatRuntime(runtime)}, it fits within your time limit.`);
  }

  const selectedPlatforms = prefs.platforms.map(getPlatform).filter((p) => p?.providerIds.length);
  const streamingOn = (details?.providers ?? [])
    .filter((provider) =>
      selectedPlatforms.some((p) => p.providerIds.includes(provider.id) || p.name === provider.name),
    )
    .map((provider) => provider.name);
  if (streamingOn.length) {
    sentences.push(`You can stream it on ${formatList(streamingOn)}.`);
  }

  return sentences.join(" ");
}
