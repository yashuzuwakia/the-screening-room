/** Region code for the Discover “Global” tab (not a real ISO country). */
export const GLOBAL_DISCOVER_REGION = "GL";

export function normalizeListKind(listKind) {
  if (listKind === "genre") return "genre";
  if (listKind === "global") return "global";
  return "regional";
}

export function resolveCurationSlot({ region, listKind, genreId }) {
  const listKindNorm = normalizeListKind(listKind);
  const regionCode =
    listKindNorm === "global" ? GLOBAL_DISCOVER_REGION : (region || "").toUpperCase();
  return {
    region: regionCode,
    listKind: listKindNorm,
    genreId: listKindNorm === "genre" ? Number(genreId) : null,
  };
}
