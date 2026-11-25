import { prisma } from "../lib/prisma.js";
import { ensureMoviesSynced } from "./movieSync.js";

const postSelect = {
  id: true,
  title: true,
  body: true,
  type: true,
  createdAt: true,
  user: { select: { id: true, displayName: true } },
  movie: { select: { tmdbId: true, title: true, posterPath: true } },
  _count: { select: { replies: true, likes: true } },
};

export async function listFeed({ cursor, take = 20 } = {}) {
  const posts = await prisma.communityPost.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: postSelect,
  });

  const hasMore = posts.length > take;
  const slice = hasMore ? posts.slice(0, take) : posts;
  const nextCursor = hasMore ? slice[slice.length - 1].id : null;

  return {
    items: slice.map(serializePost),
    nextCursor,
  };
}

function serializePost(p) {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    type: p.type,
    createdAt: p.createdAt,
    author: p.user.displayName,
    replyCount: p._count.replies,
    likeCount: p._count.likes,
    movie: p.movie
      ? { tmdbId: p.movie.tmdbId, title: p.movie.title, posterPath: p.movie.posterPath }
      : null,
  };
}

export async function createPost(userId, { title, body, type = "discussion", movieTmdbId = null }) {
  let movieId = null;
  if (movieTmdbId) {
    await ensureMoviesSynced([movieTmdbId]);
    const movie = await prisma.movie.findUnique({ where: { tmdbId: movieTmdbId } });
    movieId = movie?.id ?? null;
  }

  const post = await prisma.communityPost.create({
    data: { userId, title, body, type, movieId },
    select: postSelect,
  });
  return serializePost(post);
}

export async function addReply(userId, postId, body, parentId = null) {
  return prisma.communityReply.create({
    data: { userId, postId, body, parentId },
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { displayName: true } },
    },
  });
}

export async function toggleLike(userId, postId) {
  const existing = await prisma.communityLike.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existing) {
    await prisma.communityLike.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  await prisma.communityLike.create({ data: { userId, postId } });
  return { liked: true };
}

export async function softDeletePost(userId, postId, role) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) {
    const err = new Error("Post not found");
    err.status = 404;
    throw err;
  }
  if (post.userId !== userId && role !== "admin") {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  await prisma.communityPost.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  });
}
