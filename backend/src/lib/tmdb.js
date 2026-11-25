import { config } from "../config.js";

const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

const cache = new Map();

export class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

export function tmdbImage(path, size = "w500") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export async function tmdbFetch(path, params = {}) {
  if (!config.tmdbApiKey) {
    throw new TmdbError("TMDB_API_KEY is not configured on the server", 503);
  }

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", config.tmdbApiKey);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const cacheKey = url.toString();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new TmdbError(`TMDB request failed (${response.status})`, response.status);
    }
    return response.json();
  });

  request.catch(() => cache.delete(cacheKey));
  cache.set(cacheKey, request);
  return request;
}
