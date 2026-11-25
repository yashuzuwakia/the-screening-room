/**
 * Mirror of backend — editorial pins for Discover (keep in sync).
 * See `backend/src/constants/curatedDiscover.js` for docs.
 */

export const CURATED_DISCOVER_SLOTS = [
  {
    region: "GL",
    tab: "global",
    entries: [],
  },
  {
    region: "IN",
    tab: "regional",
    entries: [],
  },
  {
    region: "IN",
    genreId: 28,
    entries: [],
  },
];

export function findCuratedSlot(region, { tab, genreId } = {}) {
  const code = region?.toUpperCase();
  if (!code) return null;

  const forRegion = CURATED_DISCOVER_SLOTS.filter((slot) => slot.region === code);

  if (tab === "global" && code === "GL") {
    return forRegion.find((slot) => slot.tab === "global") ?? null;
  }

  if (genreId != null) {
    return forRegion.find((slot) => slot.genreId === Number(genreId)) ?? null;
  }

  if (tab) {
    return forRegion.find((slot) => slot.tab === tab && slot.genreId == null) ?? null;
  }

  return null;
}
