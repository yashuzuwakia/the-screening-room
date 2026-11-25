import { getMood } from "../constants/moods";
import { getGenreName } from "../constants/genres";
import { getPlatform } from "../constants/platforms";
import { EMPTY_PREFERENCES } from "./preferences";

export const FIND_DRAFT_STORAGE_KEY = "moviematch:find-draft";
const STORAGE_KEY = FIND_DRAFT_STORAGE_KEY;

const STEP_LABELS = ["Mood", "Genres", "Platforms", "Time"];

export function isWizardComplete(prefs) {
  const genresOk = prefs?.mood === "surprise" || (prefs?.genres?.length ?? 0) > 0;
  return Boolean(prefs?.mood && genresOk && prefs.platforms?.length > 0 && prefs.runtime);
}

export function hasDraftProgress(prefs, stepIndex = 0) {
  if (isWizardComplete(prefs)) return false;
  return (
    stepIndex > 0 ||
    Boolean(prefs?.mood) ||
    (prefs?.genres?.length ?? 0) > 0 ||
    (prefs?.platforms?.length ?? 0) > 0
  );
}

export function loadFindDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.prefs) return null;
    const prefs = {
      ...EMPTY_PREFERENCES,
      mood: data.prefs.mood ?? "",
      genres: Array.isArray(data.prefs.genres) ? data.prefs.genres : [],
      platforms: Array.isArray(data.prefs.platforms) ? data.prefs.platforms : [],
      runtime: data.prefs.runtime ?? "",
    };
    const stepIndex = Number.isFinite(data.stepIndex) ? data.stepIndex : 0;
    if (!hasDraftProgress(prefs, stepIndex)) return null;
    return { prefs, stepIndex, updatedAt: data.updatedAt ?? 0 };
  } catch {
    return null;
  }
}

export function saveFindDraft({ prefs, stepIndex }) {
  if (!hasDraftProgress(prefs, stepIndex)) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        prefs,
        stepIndex,
        updatedAt: Date.now(),
      }),
    );
    window.dispatchEvent(new CustomEvent("moviematch:find-draft"));
  } catch {
    /* quota or private mode */
  }
}

export function clearFindDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("moviematch:find-draft"));
  } catch {
    /* ignore */
  }
}

export function describeFindDraft(draft) {
  if (!draft?.prefs) return "Pick up where you left off";
  const { prefs, stepIndex } = draft;
  const parts = [];
  const mood = getMood(prefs.mood);
  if (mood) parts.push(mood.label);
  if (prefs.genres?.length) {
    const names = prefs.genres.slice(0, 2).map(getGenreName);
    parts.push(names.join(", ") + (prefs.genres.length > 2 ? "…" : ""));
  }
  if (prefs.platforms?.length) {
    const names = prefs.platforms
      .slice(0, 2)
      .map((id) => getPlatform(id)?.name)
      .filter(Boolean);
    if (names.length) parts.push(names.join(", "));
  }
  const stepLabel = STEP_LABELS[stepIndex] ?? "Mood";
  const detail = parts.length ? parts.join(" · ") : `Stopped at ${stepLabel}`;
  return `Continue your search — ${detail}`;
}
