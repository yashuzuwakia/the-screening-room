/** Account-backed "I've seen it" list for Find — synced from POST /api/seen, undo via DELETE. */
import { prisma } from "../lib/prisma.js";

const MAX_SEEN = 2000;

export async function listSeenTmdbIds(userId, { source = "watched" } = {}) {
  const rows = await prisma.userSeenMovie.findMany({
    where: { userId, ...(source ? { source } : {}) },
    select: { tmdbId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: MAX_SEEN,
  });
  return rows.map((r) => r.tmdbId);
}

export async function removeSeenMovies(userId, tmdbIds) {
  const ids = [...new Set(tmdbIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return { removed: 0 };
  const result = await prisma.userSeenMovie.deleteMany({
    where: { userId, tmdbId: { in: ids }, source: "watched" },
  });
  return { removed: result.count };
}

export async function addSeenMovies(userId, tmdbIds, source = "watched") {
  const ids = [...new Set(tmdbIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return { added: 0 };

  const allowedSource = source === "passed" ? "passed" : "watched";

  await prisma.$transaction(
    ids.map((tmdbId) =>
      prisma.userSeenMovie.upsert({
        where: { userId_tmdbId: { userId, tmdbId } },
        create: { userId, tmdbId, source: allowedSource },
        update: { source: allowedSource },
      }),
    ),
  );

  const count = await prisma.userSeenMovie.count({ where: { userId } });
  if (count > MAX_SEEN) {
    const overflow = await prisma.userSeenMovie.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: count - MAX_SEEN,
      select: { id: true },
    });
    await prisma.userSeenMovie.deleteMany({ where: { id: { in: overflow.map((r) => r.id) } } });
  }

  return { added: ids.length };
}
