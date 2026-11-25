import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { tmdbFetch, tmdbImage } from "../lib/tmdb.js";
import { fromDbMovie, fromTmdbListItem, toDbMovieFields } from "../utils/movieDto.js";

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
    return row ? fromDbMovie(row) : m;
  });
}

export async function getMovieDetails(tmdbId) {
  const row = await prisma.movie.findUnique({ where: { tmdbId } });
  const stale = !row || Date.now() - row.syncedAt.getTime() > STALE_MS;
  const dbRow = stale ? await upsertMovieFromTmdb(tmdbId) : row;

  const data = await tmdbFetch(`/movie/${tmdbId}`, {
    append_to_response: "credits,videos,watch/providers,recommendations",
  });

  const trailer =
    data.videos?.results?.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    data.videos?.results?.find((v) => v.site === "YouTube");

  const region = data["watch/providers"]?.results?.[config.watchRegion];
  const providers = (region?.flatrate ?? []).map((p) => ({
    id: p.provider_id,
    name: p.provider_name,
    logoUrl: tmdbImage(p.logo_path, "w92"),
  }));

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
    watchLink: region?.link ?? null,
    similar: enrichedSimilar,
  };
}

export async function listTrending() {
  const data = await tmdbFetch("/trending/movie/week");
  const movies = data.results.filter((m) => m.poster_path).map(fromTmdbListItem);
  return enrichMoviesFromDb(movies);
}

export async function listByGenre(genreId) {
  const data = await tmdbFetch("/discover/movie", {
    with_genres: genreId,
    sort_by: "popularity.desc",
    "vote_count.gte": 200,
  });
  const movies = data.results.filter((m) => m.poster_path).map(fromTmdbListItem);
  return enrichMoviesFromDb(movies);
}
