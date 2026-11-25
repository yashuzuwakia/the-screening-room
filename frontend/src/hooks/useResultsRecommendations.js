import { useCallback, useState } from "react";
import { useAsync } from "./useAsync";
import { getRecommendations } from "../services/recommendationService";
import { useProfile } from "./useProfile";

const MAX_BATCH_REFRESH = 2;

/**
 * Results-specific recommendations: sends excludeIds (seen, passed, recent picks) to the API/TMDB path.
 * `batch` bumps when the user exhausts the current list so we can fetch deeper discover pages.
 */
export function useResultsRecommendations(prefs, excludeIds) {
  const { watchRegion } = useProfile();
  const [batch, setBatch] = useState(0);

  const fetcher = useCallback(() => {
    return getRecommendations({
      ...prefs,
      watchRegion,
      excludeIds,
      _batch: batch,
    });
  }, [prefs, watchRegion, batch, excludeIds]);

  const { data, error, isLoading } = useAsync(fetcher);

  const canRequestFreshBatch = batch < MAX_BATCH_REFRESH && !data?.exhausted;

  const requestFreshBatch = useCallback(() => {
    if (!canRequestFreshBatch) return;
    setBatch((n) => n + 1);
  }, [canRequestFreshBatch]);

  return {
    data,
    error,
    isLoading,
    batch,
    requestFreshBatch,
    canRequestFreshBatch,
  };
}
