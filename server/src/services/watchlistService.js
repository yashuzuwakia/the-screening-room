import { prisma } from "../lib/prisma.js";
import { ensureMoviesSynced } from "./movieSync.js";
import { fromDbMovie } from "../utils/movieDto.js";

export async function listWatchlist(userId) {
  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    include: { movie: true },
    orderBy: { addedAt: "desc" },
  });
  return items.map((item) => fromDbMovie(item.movie, { addedAt: item.addedAt }));
}

export async function addToWatchlist(userId, tmdbId) {
  await ensureMoviesSynced([tmdbId]);
  const movie = await prisma.movie.findUniqueOrThrow({ where: { tmdbId } });
  await prisma.watchlistItem.upsert({
    where: { userId_movieId: { userId, movieId: movie.id } },
    create: { userId, movieId: movie.id },
    update: {},
  });
  return fromDbMovie(movie);
}

export async function removeFromWatchlist(userId, tmdbId) {
  const movie = await prisma.movie.findUnique({ where: { tmdbId } });
  if (!movie) return;
  await prisma.watchlistItem.deleteMany({ where: { userId, movieId: movie.id } });
}
