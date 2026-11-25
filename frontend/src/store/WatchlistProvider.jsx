import { useCallback, useEffect, useState } from "react";
import { WatchlistContext } from "./watchlistContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { apiFetch, getAuthToken, isApiMode } from "../services/apiClient.js";

const STORAGE_KEY = "moviematch:watchlist";

const toEntry = (movie) => ({
  id: movie.id ?? movie.tmdbId,
  title: movie.title,
  year: movie.year,
  rating: movie.rating ?? movie.communityRating,
  posterUrl: movie.posterUrl,
  genreIds: movie.genreIds ?? [],
  overview: movie.overview,
  runtime: movie.runtime,
  addedAt: movie.addedAt ?? Date.now(),
});

export default function WatchlistProvider({ children }) {
  const [items, setItems] = useLocalStorage(STORAGE_KEY, []);
  const needsSync = isApiMode() && Boolean(getAuthToken());
  const [synced, setSynced] = useState(!needsSync);

  const reload = useCallback(async () => {
    if (!isApiMode() || !getAuthToken()) return;
    const data = await apiFetch("/watchlist");
    setItems(data.items.map(toEntry));
    setSynced(true);
  }, [setItems]);

  useEffect(() => {
    if (!needsSync) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/watchlist");
        if (!cancelled) setItems(data.items.map(toEntry));
      } catch {
        /* keep local list on sync failure */
      } finally {
        if (!cancelled) setSynced(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsSync, setItems]);

  const has = (id) => items.some((item) => item.id === id);

  const add = async (movie) => {
    if (isApiMode() && getAuthToken()) {
      await apiFetch("/watchlist", { method: "POST", body: { tmdbId: movie.id } });
      await reload();
      return;
    }
    setItems((current) => (current.some((i) => i.id === movie.id) ? current : [toEntry(movie), ...current]));
  };

  const remove = async (id) => {
    if (isApiMode() && getAuthToken()) {
      await apiFetch(`/watchlist/${id}`, { method: "DELETE" });
      await reload();
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const toggle = async (movie) => (has(movie.id) ? remove(movie.id) : add(movie));

  const removeMany = async (ids) => {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    if (isApiMode() && getAuthToken()) {
      if (unique.length === 1) {
        await apiFetch(`/watchlist/${unique[0]}`, { method: "DELETE" });
      } else {
        await apiFetch("/watchlist/bulk", { method: "DELETE", body: { tmdbIds: unique } });
      }
      await reload();
      return;
    }
    setItems((current) => current.filter((item) => !unique.includes(item.id)));
  };

  const clear = async () => {
    if (items.length === 0) return;
    const ids = items.map((m) => m.id);
    await removeMany(ids);
  };

  return (
    <WatchlistContext.Provider value={{ items, has, add, remove, removeMany, toggle, clear, synced }}>
      {children}
    </WatchlistContext.Provider>
  );
}
