/**
 * Per–wizard-combo memory so a second Find with the same mood/genres/platforms/runtime
 * does not surface the same top picks again. Local only; separate from global "already seen".
 */
import { preferencesToSearch } from "./preferences";

const STORAGE_KEY = "moviematch:recent-find-picks";
const MAX_IDS_PER_PREFS = 20;
const MAX_FINGERPRINTS = 30;

export function prefsFingerprint(prefs) {
  if (!prefs) return "";
  const genres = [...(prefs.genres ?? [])].sort((a, b) => a - b).join(",");
  const platforms = [...(prefs.platforms ?? [])].sort().join(",");
  return `${prefs.mood}|${genres}|${platforms}|${prefs.runtime}`;
}

export function prefsSearchKey(prefs) {
  return preferencesToSearch(prefs).replace(/^\?/, "");
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function saveStore(data) {
  try {
    const keys = Object.keys(data);
    const trimmed =
      keys.length > MAX_FINGERPRINTS
        ? Object.fromEntries(
            keys
              .sort((a, b) => (data[b]?.updatedAt ?? 0) - (data[a]?.updatedAt ?? 0))
              .slice(0, MAX_FINGERPRINTS)
              .map((k) => [k, data[k]]),
          )
        : data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/** Remember a title we already surfaced for this mood/genre/runtime combo. */
export function recordPrefsPick(prefs, tmdbId) {
  const id = Number(tmdbId);
  const fp = prefsFingerprint(prefs);
  if (!fp || !Number.isFinite(id)) return;
  const store = loadStore();
  const entry = store[fp] ?? { ids: [], updatedAt: 0 };
  const ids = [...new Set([id, ...entry.ids])].slice(0, MAX_IDS_PER_PREFS);
  store[fp] = { ids, updatedAt: Date.now() };
  saveStore(store);
}

export function recentPickIdsForPrefs(prefs) {
  const fp = prefsFingerprint(prefs);
  if (!fp) return [];
  const store = loadStore();
  const ids = store[fp]?.ids;
  return Array.isArray(ids) ? ids.map(Number).filter((id) => Number.isFinite(id)) : [];
}
