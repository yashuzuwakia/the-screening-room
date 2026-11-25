import { useCallback } from "react";
import { useAsync } from "./useAsync";
import { getRecommendations } from "../services/recommendationService";
import { preferencesFromSearch } from "../utils/preferences";
import { useProfile } from "./useProfile";

export function useRecommendations(search) {
  const { watchRegion } = useProfile();
  const fetcher = useCallback(() => {
    const prefs = preferencesFromSearch(new URLSearchParams(search));
    return prefs ? getRecommendations({ ...prefs, watchRegion }) : Promise.resolve(null);
  }, [search, watchRegion]);
  return useAsync(fetcher);
}
