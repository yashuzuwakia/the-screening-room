import { tmdbImage } from "./tmdbClient";
import { mapStreamingProviders } from "../utils/streamingLinks.js";
import { WATCH_REGION } from "../constants/platforms";

const roundRating = (value) => (value ? Math.round(value * 10) / 10 : null);

export function normalizeMovie(raw) {
  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? "Untitled",
    year: raw.release_date ? raw.release_date.slice(0, 4) : "",
    releaseDate: raw.release_date ?? "",
    rating: roundRating(raw.vote_average ?? raw.rating),
    voteCount: raw.vote_count ?? raw.voteCount ?? 0,
    communityRating: raw.communityRating ?? raw.community_avg ?? null,
    communityCount: raw.communityCount ?? raw.community_count ?? 0,
    popularity: raw.popularity ?? 0,
    runtime: raw.runtime || null,
    overview: raw.overview ?? "",
    posterUrl: raw.posterUrl ?? tmdbImage(raw.poster_path, "w500"),
    backdropUrl: raw.backdropUrl ?? tmdbImage(raw.backdrop_path, "w1280"),
    genreIds: raw.genre_ids ?? raw.genreIds ?? raw.genres?.map((g) => g.id) ?? [],
  };
}

function pickTrailer(videos = []) {
  const youtube = videos.filter((v) => v.site === "YouTube");
  const trailer =
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube[0];
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

export function normalizeMovieDetails(raw, watchRegion = WATCH_REGION) {
  const regionCode = watchRegion?.toUpperCase() || "US";
  const regionProviders = raw["watch/providers"]?.results?.[regionCode];
  const providers = mapStreamingProviders(
    { flatrate: regionProviders?.flatrate ?? [], title: raw.title, region: regionCode },
    (path) => tmdbImage(path, "w92"),
  );

  return {
    ...normalizeMovie(raw),
    tagline: raw.tagline ?? "",
    director: raw.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
    cast: (raw.credits?.cast ?? []).slice(0, 6).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      photoUrl: tmdbImage(c.profile_path, "w185"),
    })),
    trailerUrl: pickTrailer(raw.videos?.results),
    providers,
    watchRegion: regionCode,
    similar: (raw.recommendations?.results ?? [])
      .filter((m) => m.poster_path)
      .slice(0, 12)
      .map(normalizeMovie),
  };
}
