const STORAGE_KEY = "moviematch:recent-searches";
const MAX = 8;

export function readRecentMovieSearches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === "string" && q.trim()) : [];
  } catch {
    return [];
  }
}

export function pushRecentMovieSearch(query) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return readRecentMovieSearches();
  const prev = readRecentMovieSearches().filter((item) => item.toLowerCase() !== q.toLowerCase());
  const next = [q, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}
