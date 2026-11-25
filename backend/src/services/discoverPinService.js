import { prisma } from "../lib/prisma.js";
import {
  GLOBAL_DISCOVER_REGION,
  normalizeListKind,
  resolveCurationSlot,
} from "../constants/discoverCuration.js";

const MAX_PINS_PER_SLOT = 20;

function slotWhere(data) {
  return resolveCurationSlot(data);
}

function slotWhereFromPin(pin) {
  return slotWhere({ region: pin.region, listKind: pin.listKind, genreId: pin.genreId });
}

function clampPosition(position) {
  return Math.min(MAX_PINS_PER_SLOT, Math.max(1, Number(position) || 1));
}

async function reassignPositions(tx, orderedPins) {
  const list = orderedPins.slice(0, MAX_PINS_PER_SLOT);
  for (let i = 0; i < list.length; i++) {
    await tx.discoverPin.update({
      where: { id: list[i].id },
      data: { position: i + 1 },
    });
  }
  const drop = orderedPins.slice(MAX_PINS_PER_SLOT);
  if (drop.length) {
    await tx.discoverPin.deleteMany({ where: { id: { in: drop.map((p) => p.id) } } });
  }
}

async function loadSlotPins(tx, slot) {
  return tx.discoverPin.findMany({
    where: slot,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

function insertAtPosition(sortedPins, pin, targetPosition, { replaceTmdbId } = {}) {
  let list = sortedPins.filter((p) => p.id !== pin.id);
  if (replaceTmdbId != null) {
    list = list.filter((p) => p.tmdbId !== replaceTmdbId);
  }
  const index = Math.min(list.length, clampPosition(targetPosition) - 1);
  list.splice(index, 0, pin);
  return list;
}

const pinInclude = { createdBy: { select: { displayName: true, email: true } } };

export async function listDiscoverPins({ region, listKind, genreId, activeOnly = false } = {}) {
  const where = {};
  if (region) where.region = region.toUpperCase();
  if (listKind) where.listKind = normalizeListKind(listKind);
  if (listKind === "genre" && genreId != null) where.genreId = Number(genreId);
  if (listKind === "regional" || listKind === "global") where.genreId = null;
  if (activeOnly) where.active = true;
  return prisma.discoverPin.findMany({
    where,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: pinInclude,
  });
}

export async function enrichPinsWithTitles(pins) {
  if (!pins?.length) return [];
  const tmdbIds = [...new Set(pins.map((p) => p.tmdbId))];
  const movies = await prisma.movie.findMany({
    where: { tmdbId: { in: tmdbIds } },
    select: { tmdbId: true, title: true, releaseDate: true, posterPath: true },
  });
  const byTmdb = new Map(movies.map((m) => [m.tmdbId, m]));
  return pins.map((pin) => {
    const movie = byTmdb.get(pin.tmdbId);
    return {
      ...pin,
      title: movie?.title ?? null,
      year: movie?.releaseDate ? movie.releaseDate.slice(0, 4) : null,
    };
  });
}

/** Entries shaped for curated merge ({ tmdbId, position, overrides }). */
export async function listActivePinEntries(region, { tab, genreId } = {}) {
  let where;
  if (tab === "global") {
    where = { region: GLOBAL_DISCOVER_REGION, listKind: "global", genreId: null, active: true };
  } else if (genreId != null) {
    const code = region?.toUpperCase();
    if (!code) return [];
    where = { region: code, listKind: "genre", genreId: Number(genreId), active: true };
  } else {
    const code = region?.toUpperCase();
    if (!code) return [];
    where = { region: code, listKind: "regional", genreId: null, active: true };
  }

  const pins = await prisma.discoverPin.findMany({
    where,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return pins.map((pin) => ({
    tmdbId: pin.tmdbId,
    position: pin.position,
    overrides: pin.overrides && typeof pin.overrides === "object" ? pin.overrides : undefined,
  }));
}

export async function createDiscoverPin(userId, data) {
  const slot = slotWhere(data);
  const listKind = slot.listKind;
  const genreId = slot.genreId;
  if (!slot.region || slot.region.length !== 2) {
    const err = new Error("region must be a 2-letter country code");
    err.status = 400;
    throw err;
  }
  if (listKind === "genre" && !genreId) {
    const err = new Error("genreId is required for genre pins");
    err.status = 400;
    throw err;
  }
  const tmdbId = Number(data.tmdbId);
  if (!tmdbId) {
    const err = new Error("tmdbId is required");
    err.status = 400;
    throw err;
  }
  const targetPosition = clampPosition(data.position);

  return prisma.$transaction(async (tx) => {
    await tx.discoverExclusion.deleteMany({
      where: { region: slot.region, listKind, genreId, tmdbId },
    });

    const existing = await loadSlotPins(tx, slot);
    const duplicate = existing.find((p) => p.tmdbId === tmdbId);
    if (duplicate) {
      await tx.discoverPin.delete({ where: { id: duplicate.id } });
    }

    const pin = await tx.discoverPin.create({
      data: {
        region: slot.region,
        listKind,
        genreId,
        tmdbId,
        position: targetPosition,
        overrides: data.overrides ?? undefined,
        active: data.active !== false,
        createdById: userId,
      },
    });

    const withoutDup = existing.filter((p) => p.tmdbId !== tmdbId);
    const ordered = insertAtPosition(withoutDup, pin, targetPosition);
    await reassignPositions(tx, ordered);

    return tx.discoverPin.findUnique({
      where: { id: pin.id },
      include: pinInclude,
    });
  });
}

export async function updateDiscoverPin(id, data) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.discoverPin.findUnique({ where: { id } });
    if (!current) {
      const err = new Error("Pin not found");
      err.status = 404;
      throw err;
    }

    const slot = slotWhereFromPin(current);
    const patch = {};
    if (data.active != null) patch.active = Boolean(data.active);
    if (data.overrides !== undefined) patch.overrides = data.overrides;

    const positionChanges = data.position != null;
    const targetPosition = positionChanges ? clampPosition(data.position) : current.position;

    if (Object.keys(patch).length) {
      await tx.discoverPin.update({ where: { id }, data: patch });
    }

    let slotPins = await loadSlotPins(tx, slot);
    const pin = slotPins.find((p) => p.id === id) ?? { ...current, ...patch };

    if (positionChanges) {
      slotPins = slotPins.filter((p) => p.id !== id);
      const merged = { ...pin, ...patch, position: targetPosition };
      const ordered = insertAtPosition(slotPins, merged, targetPosition);
      await reassignPositions(tx, ordered);
    }

    return tx.discoverPin.findUnique({ where: { id }, include: pinInclude });
  });
}

export async function deleteDiscoverPin(id) {
  return prisma.$transaction(async (tx) => {
    const pin = await tx.discoverPin.findUnique({ where: { id } });
    if (!pin) return null;

    const slot = slotWhereFromPin(pin);
    await tx.discoverPin.delete({ where: { id } });
    const remaining = await loadSlotPins(tx, slot);
    await reassignPositions(tx, remaining);
    return pin;
  });
}

/** Remove all featured pins for a list slot — Discover falls back to TMDB order. */
export async function resetDiscoverPins(data) {
  const slot = slotWhere(data);
  const { listKind, genreId } = slot;
  if (!slot.region || slot.region.length !== 2) {
    const err = new Error("region must be a 2-letter country code");
    err.status = 400;
    throw err;
  }
  if (listKind === "genre" && !genreId) {
    const err = new Error("genreId is required for genre pins");
    err.status = 400;
    throw err;
  }

  const result = await prisma.discoverPin.deleteMany({
    where: {
      region: slot.region,
      listKind,
      genreId,
    },
  });
  return { deleted: result.count };
}

/** Set featured order: first N TMDB ids become pins at ranks 1..N for this list slot. */
export async function reorderDiscoverPins(userId, data) {
  const slot = slotWhere(data);
  const { listKind, genreId } = slot;
  if (!slot.region || slot.region.length !== 2) {
    const err = new Error("region must be a 2-letter country code");
    err.status = 400;
    throw err;
  }
  if (listKind === "genre" && !genreId) {
    const err = new Error("genreId is required for genre pins");
    err.status = 400;
    throw err;
  }

  const raw = Array.isArray(data.orderedTmdbIds) ? data.orderedTmdbIds : [];
  const unique = [];
  const seen = new Set();
  for (const value of raw) {
    const tmdbId = Number(value);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0 || seen.has(tmdbId)) continue;
    seen.add(tmdbId);
    unique.push(tmdbId);
    if (unique.length >= MAX_PINS_PER_SLOT) break;
  }

  return prisma.$transaction(async (tx) => {
    if (unique.length) {
      await tx.discoverExclusion.deleteMany({
        where: { region: slot.region, listKind, genreId, tmdbId: { in: unique } },
      });
    }

    const existing = await loadSlotPins(tx, slot);
    const pinDeleteWhere = { region: slot.region, listKind, genreId };
    if (unique.length) {
      await tx.discoverPin.deleteMany({
        where: { ...pinDeleteWhere, tmdbId: { notIn: unique } },
      });
    } else {
      await tx.discoverPin.deleteMany({ where: pinDeleteWhere });
    }

    const orderedPins = [];
    for (let i = 0; i < unique.length; i++) {
      const tmdbId = unique[i];
      const prior = existing.find((p) => p.tmdbId === tmdbId);
      if (prior) {
        orderedPins.push(prior);
      } else {
        const created = await tx.discoverPin.create({
          data: {
            region: slot.region,
            listKind,
            genreId,
            tmdbId,
            position: i + 1,
            active: true,
            createdById: userId,
          },
        });
        orderedPins.push(created);
      }
    }

    await reassignPositions(tx, orderedPins);
    return orderedPins;
  });
}
