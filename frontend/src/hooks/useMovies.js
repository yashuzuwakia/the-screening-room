import { useCallback } from "react";
import { useAsync } from "./useAsync";
import {
  getGlobalPopularMovies,
  getMovieDetails,
  getMoviesByGenre,
  getTrendingMovies,
  searchMovies,
  suggestMovies,
} from "../services/movieService";
import { useProfile } from "./useProfile";

/** Worldwide popular — unchanged when country changes. */
export function useTrendingMovies() {
  const fetcher = useCallback(() => getGlobalPopularMovies(), []);
  return useAsync(fetcher);
}

/** Popular in the user's selected country. */
export function useRegionalPopularMovies() {
  const { watchRegion } = useProfile();
  const fetcher = useCallback(() => getTrendingMovies(watchRegion), [watchRegion]);
  return useAsync(fetcher);
}

/**
 * @param {number|null} genreId
 * @param {"global"|"regional"} scope — when no genre, choose worldwide vs country list
 */
export function useMovieList(genreId, scope = "global", reloadEpoch = 0) {
  const { watchRegion } = useProfile();
  const fetcher = useCallback(() => {
    if (genreId != null) return getMoviesByGenre(genreId, watchRegion);
    if (scope === "regional") return getTrendingMovies(watchRegion);
    return getGlobalPopularMovies();
  }, [genreId, scope, watchRegion]);
  return useAsync(fetcher, reloadEpoch);
}

export function useMovieSearch(query, options = {}) {
  const trimmed = typeof query === "string" ? query.trim() : "";
  const sort = options.sort ?? "relevance";
  const year = options.year ?? "";
  const minRating = options.minRating ?? "";
  const page = options.page ?? 1;
  const { watchRegion } = useProfile();
  const region = options.region ?? watchRegion;

  const fetcher = useCallback(
    () => searchMovies(trimmed, { sort, year, minRating, page, region }),
    [trimmed, sort, year, minRating, page, region],
  );
  return useAsync(fetcher);
}

export function useMovieSuggest(query, { enabled = true, limit = 8 } = {}) {
  const trimmed = typeof query === "string" ? query.trim() : "";
  const fetcher = useCallback(() => {
    if (!enabled || trimmed.length < 2) return Promise.resolve({ suggestions: [], query: trimmed });
    return suggestMovies(trimmed, limit);
  }, [trimmed, enabled, limit]);
  return useAsync(fetcher);
}

export function useMovieDetails(id) {
  const { watchRegion } = useProfile();
  const fetcher = useCallback(
    () => (id ? getMovieDetails(id, watchRegion) : Promise.resolve(null)),
    [id, watchRegion],
  );
  return useAsync(fetcher);
}
