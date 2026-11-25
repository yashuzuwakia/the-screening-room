import { tmdbImage } from "../lib/tmdb.js";
import { getGenreNames } from "../constants/genres.js";

const round = (v) => (v != null ? Math.round(v * 10) / 10 : null);

export function fromTmdbListItem(raw) {
  return {
    id: raw.id,
    tmdbId: raw.id,
    title: raw.title ?? raw.name ?? "Untitled",
    year: raw.release_date ? raw.release_date.slice(0, 4) : "",
    releaseDate: raw.release_date ?? "",
    rating: round(raw.vote_average),
    voteCount: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
    runtime: raw.runtime || null,
    overview: raw.overview ?? "",
    posterUrl: tmdbImage(raw.poster_path, "w500"),
    backdropUrl: tmdbImage(raw.backdrop_path, "w1280"),
    genreIds: raw.genre_ids ?? raw.genres?.map((g) => g.id) ?? [],
  };
}

export function fromDbMovie(row, extra = {}) {
  return {
    id: row.tmdbId,
    tmdbId: row.tmdbId,
    title: row.title,
    year: row.releaseDate ? row.releaseDate.slice(0, 4) : "",
    releaseDate: row.releaseDate ?? "",
    rating: round(row.voteAverage),
    communityRating: round(row.communityAvg),
    communityCount: row.communityCount,
    voteCount: row.voteCount ?? 0,
    popularity: row.popularity ?? 0,
    runtime: row.runtime,
    overview: row.overview ?? "",
    posterUrl: tmdbImage(row.posterPath, "w500"),
    backdropUrl: tmdbImage(row.backdropPath, "w1280"),
    genreIds: row.genreIds ?? [],
    genres: getGenreNames(row.genreIds ?? []),
    ...extra,
  };
}

export function toDbMovieFields(tmdb) {
  return {
    tmdbId: tmdb.id,
    title: tmdb.title ?? tmdb.name ?? "Untitled",
    overview: tmdb.overview ?? "",
    posterPath: tmdb.poster_path ?? null,
    backdropPath: tmdb.backdrop_path ?? null,
    releaseDate: tmdb.release_date ?? null,
    runtime: tmdb.runtime ?? null,
    voteAverage: tmdb.vote_average ?? null,
    voteCount: tmdb.vote_count ?? null,
    popularity: tmdb.popularity ?? null,
    genreIds: tmdb.genre_ids ?? tmdb.genres?.map((g) => g.id) ?? [],
    syncedAt: new Date(),
  };
}
