import { useEffect, useState } from "react";

// Runs the memoized fetcher when it changes or its caller requests a new revision.
// The result is only current when both the fetcher and revision match.
export function useAsync(fetcher, revision = 0) {
  const [state, setState] = useState({ fetcher: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetcher().then(
      (data) => !cancelled && setState({ fetcher, revision, data, error: null }),
      (error) => !cancelled && setState({ fetcher, revision, data: null, error }),
    );
    return () => {
      cancelled = true;
    };
  }, [fetcher, revision]);

  const isCurrent = state.fetcher === fetcher && state.revision === revision;
  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    isLoading: !isCurrent,
  };
}
