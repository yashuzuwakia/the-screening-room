import { prisma } from "../lib/prisma.js";
import { assertCommentContent, readMediaUrlsFromDb } from "../lib/communityMedia.js";
import { ensureMoviesSynced } from "./movieSync.js";
import { tmdbImage } from "../lib/tmdb.js";

const postSelect = {
  id: true,
  title: true,
  body: true,
  mediaUrls: true,
  type: true,
  createdAt: true,
  user: { select: { id: true, displayName: true } },
  movie: { select: { tmdbId: true, title: true, posterPath: true } },
  _count: { select: { replies: true, likes: true } },
};

function autoTitleFromBody(body) {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 96) return trimmed;
  return `${trimmed.slice(0, 93)}…`;
}

export async function listPostsByMovie(tmdbId, { cursor, take = 20 } = {}) {
  await ensureMoviesSynced([tmdbId]);
  const movie = await prisma.movie.findUnique({
    where: { tmdbId: Number(tmdbId) },
    select: { id: true },
  });
  if (!movie) return { items: [], nextCursor: null };

  const posts = await prisma.communityPost.findMany({
    where: { deletedAt: null, movieId: movie.id },
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

export async function createMovieDiscussionPost(userId, tmdbId, { body, title, mediaUrls }) {
  const content = assertCommentContent({ body, mediaUrls });
  const resolvedTitle = title?.trim() || autoTitleFromBody(content.body || "Photo");
  return createPost(userId, {
    title: resolvedTitle,
    body: content.body,
    mediaUrls: content.mediaUrls,
    type: "movie",
    movieTmdbId: Number(tmdbId),
  });
}

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
    mediaUrls: readMediaUrlsFromDb(p.mediaUrls),
    type: p.type,
    createdAt: p.createdAt,
    author: p.user.displayName,
    replyCount: p._count.replies,
    likeCount: p._count.likes,
    movie: p.movie
      ? {
          tmdbId: p.movie.tmdbId,
          title: p.movie.title,
          posterUrl: tmdbImage(p.movie.posterPath, "w185"),
        }
      : null,
  };
}

export async function getPost(postId, viewerUserId = null) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, deletedAt: null },
    select: {
      ...postSelect,
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          mediaUrls: true,
          createdAt: true,
          user: { select: { displayName: true } },
        },
      },
    },
  });

  if (!post) {
    const err = new Error("Post not found");
    err.status = 404;
    throw err;
  }

  let likedByViewer = false;
  if (viewerUserId) {
    const like = await prisma.communityLike.findUnique({
      where: { userId_postId: { userId: viewerUserId, postId } },
    });
    likedByViewer = Boolean(like);
  }

  return {
    post: serializePost(post),
    replies: post.replies.map((r) => ({
      id: r.id,
      body: r.body,
      mediaUrls: readMediaUrlsFromDb(r.mediaUrls),
      createdAt: r.createdAt,
      author: r.user.displayName,
    })),
    likedByViewer,
  };
}

export async function createPost(
  userId,
  { title, body, mediaUrls = [], type = "discussion", movieTmdbId = null },
) {
  const content = assertCommentContent({ body, mediaUrls });
  let movieId = null;
  if (movieTmdbId) {
    await ensureMoviesSynced([movieTmdbId]);
    const movie = await prisma.movie.findUnique({ where: { tmdbId: movieTmdbId } });
    movieId = movie?.id ?? null;
  }

  const post = await prisma.communityPost.create({
    data: {
      userId,
      title,
      body: content.body,
      mediaUrls: content.mediaUrls,
      type,
      movieId,
    },
    select: postSelect,
  });
  return serializePost(post);
}

export async function addReply(userId, postId, body, parentId = null, mediaUrls = []) {
  const content = assertCommentContent({ body, mediaUrls });
  const reply = await prisma.communityReply.create({
    data: {
      userId,
      postId,
      body: content.body,
      mediaUrls: content.mediaUrls,
      parentId,
    },
    select: {
      id: true,
      body: true,
      mediaUrls: true,
      createdAt: true,
      user: { select: { displayName: true } },
    },
  });
  return {
    id: reply.id,
    body: reply.body,
    mediaUrls: readMediaUrlsFromDb(reply.mediaUrls),
    createdAt: reply.createdAt,
    author: reply.user.displayName,
  };
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
