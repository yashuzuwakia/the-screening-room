import { getMood } from "../constants/moods";
import { isKnownGenre } from "../constants/genres";
import { getPlatform } from "../constants/platforms";
import { getRuntimeOption } from "../constants/runtimes";

export const EMPTY_PREFERENCES = { mood: "", genres: [], platforms: [], runtime: "" };

// Preferences live in the URL so results survive a refresh and can be shared.
export function preferencesToSearch(prefs) {
  const params = new URLSearchParams({
    mood: prefs.mood,
    genres: prefs.genres.join(","),
    platforms: prefs.platforms.join(","),
    runtime: prefs.runtime,
  });
  return `?${params}`;
}

const splitList = (value) => (value ? value.split(",").filter(Boolean) : []);

export function preferencesFromSearch(searchParams) {
  const prefs = {
    mood: searchParams.get("mood") ?? "",
    genres: splitList(searchParams.get("genres")).map(Number).filter(isKnownGenre),
    platforms: splitList(searchParams.get("platforms")).filter((id) => getPlatform(id)),
    runtime: searchParams.get("runtime") ?? "",
  };
  const isComplete =
    Boolean(getMood(prefs.mood)) &&
    (prefs.mood === "surprise" || prefs.genres.length > 0) &&
    prefs.platforms.length > 0 &&
    Boolean(getRuntimeOption(prefs.runtime));
  return isComplete ? prefs : null;
}
