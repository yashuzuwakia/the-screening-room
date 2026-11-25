import { getMood } from "../constants/moods";
import { WIZARD_GENRE_IDS } from "../constants/genres";

/** Calmer adjacent mood for “similar but different”. */
const LIGHTER_MOOD = {
  thrilling: "relaxing",
  scary: "thrilling",
  "action-packed": "thrilling",
  "mind-blowing": "emotional",
  emotional: "relaxing",
  funny: "relaxing",
};

export function prefsLighterMood(prefs) {
  const nextId = LIGHTER_MOOD[prefs.mood];
  if (!nextId || !getMood(nextId)) return null;
  return { ...prefs, mood: nextId };
}

export function prefsSwapOneGenre(prefs) {
  if (!prefs.genres?.length) return null;
  const current = [...prefs.genres];
  const pool = WIZARD_GENRE_IDS.filter((id) => !current.includes(id));
  if (!pool.length) {
    if (current.length <= 1) return null;
    const trimmed = current.slice(0, -1);
    const add = WIZARD_GENRE_IDS.find((id) => !trimmed.includes(id));
    if (add == null) return null;
    return { ...prefs, genres: [...trimmed, add] };
  }
  const replaceAt = current.length - 1;
  const nextGenre = pool[0];
  const genres = [...current];
  genres[replaceAt] = nextGenre;
  return { ...prefs, genres };
}

/** One nudge on Results — swap last genre first; if impossible, step mood down (see LIGHTER_MOOD). */
export function prefsTryAnotherMix(prefs) {
  return prefsSwapOneGenre(prefs) ?? prefsLighterMood(prefs);
}
