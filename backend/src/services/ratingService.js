import { prisma } from "../lib/prisma.js";
import { ensureMoviesSynced } from "./movieSync.js";
import { fromDbMovie } from "../utils/movieDto.js";

async function refreshCommunityStats(movieId) {
  const agg = await prisma.rating.aggregate({
    where: { movieId },
    _avg: { score: true },
    _count: { _all: true },
  });

  await prisma.movie.update({
    where: { id: movieId },
    data: {
      communityAvg: agg._avg.score,
      communityCount: agg._count._all,
    },
  });
}

export async function setRating(userId, tmdbId, score, review = null) {
  if (score < 0.5 || score > 10) {
    const err = new Error("Score must be between 0.5 and 10");
    err.status = 400;
    throw err;
  }

  await ensureMoviesSynced([tmdbId]);
  const movie = await prisma.movie.findUniqueOrThrow({ where: { tmdbId } });

  await prisma.rating.upsert({
    where: { userId_movieId: { userId, movieId: movie.id } },
    create: { userId, movieId: movie.id, score, review },
    update: { score, review },
  });

  await refreshCommunityStats(movie.id);

  const updated = await prisma.movie.findUnique({ where: { id: movie.id } });
  const userRating = await prisma.rating.findUnique({
    where: { userId_movieId: { userId, movieId: movie.id } },
  });

  return {
    movie: fromDbMovie(updated),
    userRating: { score: userRating.score, review: userRating.review },
  };
}

export async function deleteRating(userId, tmdbId) {
  const movie = await prisma.movie.findUnique({ where: { tmdbId } });
  if (!movie) return null;

  await prisma.rating.deleteMany({ where: { userId, movieId: movie.id } });
  await refreshCommunityStats(movie.id);

  const updated = await prisma.movie.findUnique({ where: { id: movie.id } });
  return updated ? fromDbMovie(updated) : null;
}

export async function getUserRating(userId, tmdbId) {
  const movie = await prisma.movie.findUnique({ where: { tmdbId } });
  if (!movie) return null;
  return prisma.rating.findUnique({
    where: { userId_movieId: { userId, movieId: movie.id } },
    select: { score: true, review: true, updatedAt: true },
  });
}
