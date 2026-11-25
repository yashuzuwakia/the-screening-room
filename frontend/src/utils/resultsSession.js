import { getMood } from "../constants/moods";
import { preferencesToSearch } from "./preferences";

export const RESULTS_SESSION_STORAGE_KEY = "moviematch:last-results";

export function loadResultsSession() {
  try {
    const raw = localStorage.getItem(RESULTS_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.prefs || !data?.search) return null;
    return {
      prefs: data.prefs,
      search: data.search,
      topPick: data.topPick ?? null,
      updatedAt: data.updatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export function saveResultsSession({ prefs, search, topPick }) {
  if (!prefs || !search) return;
  try {
    localStorage.setItem(
      RESULTS_SESSION_STORAGE_KEY,
      JSON.stringify({
        prefs,
        search,
        topPick: topPick
          ? {
              id: topPick.id,
              title: topPick.title,
              posterUrl: topPick.posterUrl ?? null,
              match: topPick.match ?? null,
            }
          : null,
        updatedAt: Date.now(),
      }),
    );
    window.dispatchEvent(new CustomEvent("moviematch:results-session"));
  } catch {
    /* quota */
  }
}

export function clearResultsSession() {
  try {
    localStorage.removeItem(RESULTS_SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("moviematch:results-session"));
  } catch {
    /* ignore */
  }
}

/** Query string for comparing two /results URLs (ignores ?resume=1). */
export function normalizeResultsSearch(search) {
  const raw = search?.startsWith("?") ? search.slice(1) : search ?? "";
  const params = new URLSearchParams(raw);
  params.delete("resume");
  return params.toString();
}

/** True when the saved home banner session is the same search as the current Results URL. */
export function sessionMatchesSearch(session, locationSearch) {
  if (!session?.search) return false;
  return normalizeResultsSearch(session.search) === normalizeResultsSearch(locationSearch);
}

/** Link target for "Your last match" — resume=1 keeps the same top pick when re-opening Results. */
export function resultsSessionPath(session, { resume = false } = {}) {
  let path = "/results";
  if (session?.search) {
    const raw = session.search.startsWith("?") ? session.search.slice(1) : session.search;
    const params = new URLSearchParams(raw);
    if (resume) params.set("resume", "1");
    path = `/results?${params}`;
  } else if (session?.prefs) {
    const params = new URLSearchParams(preferencesToSearch(session.prefs).replace(/^\?/, ""));
    if (resume) params.set("resume", "1");
    path = `/results?${params}`;
  }
  return path;
}

export function describeResultsSession(session) {
  if (!session) return "";
  const mood = getMood(session.prefs?.mood);
  const parts = [];
  if (session.topPick?.title) {
    const match =
      session.topPick.match != null ? ` (${Math.round(session.topPick.match)}% match)` : "";
    parts.push(`${session.topPick.title}${match}`);
  }
  if (mood?.label) parts.push(mood.label);
  return parts.length ? parts.join(" · ") : "Your last movie picks";
}
