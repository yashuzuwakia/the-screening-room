import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, CheckSquare, Compass, Square, Trash2, WandSparkles, X } from "lucide-react";
import MovieCard from "../../components/movie/MovieCard";
import EmptyState from "../../components/common/EmptyState";
import { useWatchlist } from "../../hooks/useWatchlist";
import { formatRuntime } from "../../utils/format";
import "./Watchlist.css";

export default function Watchlist() {
  const { items, remove, removeMany, clear } = useWatchlist();
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const totalMinutes = items.reduce((sum, m) => sum + (m.runtime ?? 0), 0);
  const selectedCount = selected.size;
  const allSelected = items.length > 0 && selectedCount === items.length;

  const exitManage = () => {
    setManageMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((m) => m.id)));
  };

  const handleRemoveOne = async (movie) => {
    if (busy) return;
    if (!window.confirm(`Remove "${movie.title}" from your watchlist?`)) return;
    setBusy(true);
    try {
      await remove(movie.id);
      setSelected((current) => {
        if (!current.has(movie.id)) return current;
        const next = new Set(current);
        next.delete(movie.id);
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (busy || selectedCount === 0) return;
    const label = selectedCount === 1 ? "this movie" : `${selectedCount} movies`;
    if (!window.confirm(`Remove ${label} from your watchlist?`)) return;
    setBusy(true);
    try {
      await removeMany([...selected]);
      exitManage();
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    if (busy || items.length === 0) return;
    if (!window.confirm("Remove every movie from your watchlist?")) return;
    setBusy(true);
    try {
      await clear();
      exitManage();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <header className="watchlist__header">
        <div>
          <span className="eyebrow">
            <Bookmark size={14} /> Your collection
          </span>
          <h1 className="watchlist__title">Watchlist</h1>
          {items.length > 0 && (
            <p className="text-muted">
              {items.length} {items.length === 1 ? "movie" : "movies"}
              {totalMinutes > 0 && ` · about ${formatRuntime(totalMinutes)} of viewing`}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <div className="watchlist__actions">
            {!manageMode ? (
              <>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setManageMode(true)}>
                  <CheckSquare size={16} /> Select
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={handleClearAll} disabled={busy}>
                  <Trash2 size={16} /> Clear all
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn--ghost btn--sm" onClick={exitManage} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={selectAll} disabled={busy}>
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleRemoveSelected}
                  disabled={busy || selectedCount === 0}
                >
                  <Trash2 size={16} /> Remove{selectedCount > 0 ? ` (${selectedCount})` : ""}
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {items.length ? (
        <div className="movie-grid movie-grid--large watchlist__grid">
          {items.map((movie, index) => {
            const isSelected = selected.has(movie.id);
            return (
              <div
                key={movie.id}
                className={`watchlist-item${isSelected ? " is-selected" : ""}${manageMode ? " watchlist-item--manage" : ""}`}
              >
                {manageMode && (
                  <button
                    type="button"
                    className="watchlist-item__select"
                    onClick={() => toggleSelect(movie.id)}
                    aria-pressed={isSelected}
                    aria-label={isSelected ? `Deselect ${movie.title}` : `Select ${movie.title}`}
                  >
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                )}
                <MovieCard movie={movie} index={index} disableNav={manageMode} />
                {!manageMode && (
                  <button
                    type="button"
                    className="watchlist-item__remove"
                    onClick={() => handleRemoveOne(movie)}
                    disabled={busy}
                    aria-label={`Remove ${movie.title} from watchlist`}
                    title="Remove from watchlist"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Your watchlist is empty"
          description="Tap the bookmark on any movie to save it here for later."
        >
          <Link to="/find" className="btn btn--primary">
            <WandSparkles size={16} /> Find a movie
          </Link>
          <Link to="/discover" className="btn btn--secondary">
            <Compass size={16} /> Browse
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
