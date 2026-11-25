/**
 * Sort Discover results while keeping admin/static pins at their assigned ranks.
 * Unpinned slots are filled with the remaining titles in sort order.
 */
export function sortDiscoverMovies(movies, compare) {
  if (!movies?.length) return [];

  const pinned = movies.filter((m) => Number.isFinite(m.pinnedRank) && m.pinnedRank > 0);
  if (!pinned.length) return [...movies].sort(compare);

  const pinAt = new Map(pinned.map((m) => [m.pinnedRank, m]));
  const unpinned = movies.filter((m) => !Number.isFinite(m.pinnedRank) || m.pinnedRank <= 0).sort(compare);

  const out = [];
  let u = 0;
  const total = movies.length;

  for (let rank = 1; out.length < total; rank += 1) {
    if (pinAt.has(rank)) {
      out.push(pinAt.get(rank));
    } else if (u < unpinned.length) {
      out.push(unpinned[u]);
      u += 1;
    } else {
      break;
    }
  }

  while (u < unpinned.length) {
    out.push(unpinned[u]);
    u += 1;
  }

  return out;
}
