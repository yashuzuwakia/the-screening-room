const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export const isTmdbConfigured = Boolean(API_KEY);

export class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

// Requests are cached per URL for the session so navigating back and forth doesn't refetch.
const cache = new Map();

export function tmdbFetch(path, params = {}) {
  if (!isTmdbConfigured) {
    return Promise.reject(new TmdbError("TMDB API key is not configured", 0));
  }

  const url = new URL(API_BASE + path);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const cacheKey = url.toString();
  if (!cache.has(cacheKey)) {
    const request = fetch(url).then((response) => {
      if (!response.ok) {
        throw new TmdbError(`TMDB request failed (${response.status})`, response.status);
      }
      return response.json();
    });
    request.catch(() => cache.delete(cacheKey));
    cache.set(cacheKey, request);
  }
  return cache.get(cacheKey);
}

export const tmdbImage = (path, size = "w500") => (path ? `${IMAGE_BASE}/${size}${path}` : null);
