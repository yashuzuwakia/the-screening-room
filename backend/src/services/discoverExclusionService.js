import { prisma } from "../lib/prisma.js";
import {
  GLOBAL_DISCOVER_REGION,
  normalizeListKind,
  resolveCurationSlot,
} from "../constants/discoverCuration.js";
import { enrichPinsWithTitles } from "./discoverPinService.js";

function slotWhere(data) {
  return resolveCurationSlot(data);
}

const pinInclude = { createdBy: { select: { displayName: true, email: true } } };

export async function listDiscoverExclusions({ region, listKind, genreId, activeOnly = false } = {}) {
  const where = {};
  if (region) where.region = region.toUpperCase();
  if (listKind) where.listKind = normalizeListKind(listKind);
  if (listKind === "genre" && genreId != null) where.genreId = Number(genreId);
  if (listKind === "regional" || listKind === "global") where.genreId = null;
  if (activeOnly) where.active = true;

  return prisma.discoverExclusion.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: pinInclude,
  });
}

export async function listActiveExcludedTmdbIds(region, { tab, genreId } = {}) {
  let where;
  if (tab === "global") {
    where = { region: GLOBAL_DISCOVER_REGION, listKind: "global", genreId: null, active: true };
  } else if (genreId != null) {
    const code = region?.toUpperCase();
    if (!code) return new Set();
    where = { region: code, listKind: "genre", genreId: Number(genreId), active: true };
  } else {
    const code = region?.toUpperCase();
    if (!code) return new Set();
    where = { region: code, listKind: "regional", genreId: null, active: true };
  }

  const rows = await prisma.discoverExclusion.findMany({
    where,
    select: { tmdbId: true },
  });
  return new Set(rows.map((r) => r.tmdbId));
}

export async function createDiscoverExclusion(userId, data) {
  const slot = slotWhere(data);
  const listKind = slot.listKind;
  const genreId = slot.genreId;
  if (!slot.region || slot.region.length !== 2) {
    const err = new Error("region must be a 2-letter code");
    err.status = 400;
    throw err;
  }
  if (listKind === "genre" && !genreId) {
    const err = new Error("genreId is required for genre exclusions");
    err.status = 400;
    throw err;
  }
  const tmdbId = Number(data.tmdbId);
  if (!tmdbId) {
    const err = new Error("tmdbId is required");
    err.status = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    await tx.discoverPin.deleteMany({
      where: { region: slot.region, listKind, genreId, tmdbId },
    });

    const existing = await tx.discoverExclusion.findFirst({
      where: { region: slot.region, listKind, genreId, tmdbId },
    });

    if (existing) {
      return tx.discoverExclusion.update({
        where: { id: existing.id },
        data: { active: true, createdById: userId },
        include: pinInclude,
      });
    }

    return tx.discoverExclusion.create({
      data: {
        region: slot.region,
        listKind,
        genreId,
        tmdbId,
        active: data.active !== false,
        createdById: userId,
      },
      include: pinInclude,
    });
  });
}

export async function updateDiscoverExclusion(id, data) {
  const patch = {};
  if (data.active != null) patch.active = Boolean(data.active);
  return prisma.discoverExclusion.update({
    where: { id },
    data: patch,
    include: pinInclude,
  });
}

export async function deleteDiscoverExclusion(id) {
  return prisma.discoverExclusion.delete({ where: { id } });
}

export { enrichPinsWithTitles as enrichExclusionsWithTitles };
