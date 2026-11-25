import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchSeenTmdbIds, removeSeenFromServer } from "../services/seenApi";
import { getMovieDetails } from "../services/movieService";
import {
  loadSeenMovieIds,
  mergeSeenMovieIds,
  unmarkMovieSeen,
  SEEN_CHANGED_EVENT,
} from "../utils/resultsPasses";

const LIST_CAP = 24;

function placeholderMovie(id) {
  return { id: Number(id), title: `Movie #${id}`, posterUrl: null, rating: null };
}

export function useHiddenFromFind() {
  const location = useLocation();
  const [total, setTotal] = useState(() => loadSeenMovieIds().size);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const remote = await fetchSeenTmdbIds();
        if (remote?.length) mergeSeenMovieIds(remote);
      } catch (error) {
        console.warn("[useHiddenFromFind] could not sync seen list from account", error);
      }

      const all = loadSeenMovieIds();
      setTotal(all.size);
      const nextIds = [...all].slice(0, LIST_CAP);
      if (!nextIds.length) {
        setMovies([]);
        return;
      }

      const details = await Promise.all(
        nextIds.map(async (id) => {
          try {
            const movie = await getMovieDetails(id);
            return movie?.id ? movie : placeholderMovie(id);
          } catch {
            return placeholderMovie(id);
          }
        }),
      );
      setMovies(details);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(reload, 0);
    return () => window.clearTimeout(timer);
  }, [reload, location.pathname]);

  useEffect(() => {
    const onRefresh = () => reload();
    window.addEventListener(SEEN_CHANGED_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    return () => {
      window.removeEventListener(SEEN_CHANGED_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
    };
  }, [reload]);

  const remove = useCallback(
    async (tmdbId) => {
      unmarkMovieSeen(tmdbId);
      await removeSeenFromServer(tmdbId);
      await reload();
    },
    [reload],
  );

  return { movies, total, loading, remove, reload };
}
