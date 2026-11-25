/**
 * Results pass/skip state: passed = per-search URL; seen = global for Find (localStorage + optional /api/seen).
 */
import { syncSeenToServer } from "../services/seenApi.js";

const PASSED_PREFIX = "moviematch:results-passed:";
const SEEN_KEY = "moviematch:seen-movies";
const SEEN_CHANGED = "moviematch:seen-changed";

function notifySeenChanged() {
  try {
    window.dispatchEvent(new Event(SEEN_CHANGED));
  } catch {
    /* ignore */
  }
}

function searchKey(search) {
  return search?.startsWith("?") ? search.slice(1) : search ?? "";
}

export function loadPassedIds(search) {
  try {
    const raw = localStorage.getItem(`${PASSED_PREFIX}${searchKey(search)}`);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function savePassedIds(search, ids) {
  try {
    localStorage.setItem(`${PASSED_PREFIX}${searchKey(search)}`, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function loadSeenMovieIds() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.map(Number) : []);
  } catch {
    return new Set();
  }
}

export function mergeSeenMovieIds(ids) {
  const seen = loadSeenMovieIds();
  ids.forEach((id) => seen.add(Number(id)));
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500)));
  } catch {
    /* ignore */
  }
  return seen;
}

export function markMovieSeen(tmdbId, { sync = true, source = "watched" } = {}) {
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) return;
  mergeSeenMovieIds([id]);
  if (sync) void syncSeenToServer([id], source);
  notifySeenChanged();
}

export function unmarkMovieSeen(tmdbId) {
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) return;
  const seen = loadSeenMovieIds();
  if (!seen.has(id)) return;
  seen.delete(id);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
  notifySeenChanged();
}

export const SEEN_CHANGED_EVENT = SEEN_CHANGED;

export function markMoviesPassed(tmdbIds) {
  const ids = tmdbIds.map(Number).filter((id) => Number.isFinite(id));
  if (!ids.length) return;
  mergeSeenMovieIds(ids);
  void syncSeenToServer(ids, "passed");
}
