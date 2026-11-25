import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EyeOff, GripVertical } from "lucide-react";
import MovieCard from "../movie/MovieCard";
import { createDiscoverExclusion, reorderDiscoverPins } from "../../services/adminApi";
import { discoverCurateSlot } from "../../utils/discoverCurateSlot";
import DiscoverCurateHidden from "./DiscoverCurateHidden";
import "./DiscoverCurate.css";

const FEATURED_MAX = 20;

export default function DiscoverCurateGrid({
  movies,
  activeTab,
  watchRegion,
  isLoading,
  onFeaturedOrderSaved,
  onReload,
}) {
  const [items, setItems] = useState(movies);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [hiddenKey, setHiddenKey] = useState(0);

  const slot = discoverCurateSlot(activeTab, watchRegion);

  const [previousMovies, setPreviousMovies] = useState(movies);
  if (movies !== previousMovies) {
    setPreviousMovies(movies);
    setItems(movies);
  }

  const persistOrder = useCallback(
    async (ordered) => {
      setBusy(true);
      setFeedback("");
      try {
        const orderedTmdbIds = ordered.slice(0, FEATURED_MAX).map((m) => m.tmdbId ?? m.id);
        await reorderDiscoverPins({
          region: slot.region,
          listKind: slot.listKind,
          genreId: slot.listKind === "genre" ? slot.genreId : null,
          orderedTmdbIds,
        });
        setFeedback("Order saved.");
        onFeaturedOrderSaved?.(orderedTmdbIds);
        onReload?.();
      } catch (err) {
        setFeedback(err.message || "Could not save order.");
      } finally {
        setBusy(false);
      }
    },
    [slot, onFeaturedOrderSaved, onReload],
  );

  const handleDrop = (toIndex) => {
    if (dragFrom == null || dragFrom === toIndex) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
    setDragFrom(null);
    setDragOver(null);
    persistOrder(next);
  };

  const hideMovie = async (movie) => {
    const tmdbId = movie.tmdbId ?? movie.id;
    setBusy(true);
    setFeedback("");
    try {
      await createDiscoverExclusion({
        region: slot.region,
        listKind: slot.listKind,
        genreId: slot.listKind === "genre" ? slot.genreId : null,
        tmdbId,
      });
      const nextItems = items.filter((m) => (m.tmdbId ?? m.id) !== tmdbId);
      setItems(nextItems);
      const nextIds = nextItems.slice(0, FEATURED_MAX).map((m) => m.tmdbId ?? m.id);
      onFeaturedOrderSaved?.(nextIds);
      setFeedback("Removed from this list — use “Hidden” below to add it back.");
      setHiddenKey((k) => k + 1);
      onReload?.();
    } catch (err) {
      setFeedback(err.message || "Could not hide title.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="movie-grid" aria-busy="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="movie-card-skeleton">
            <div className="skeleton movie-card-skeleton__poster" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="discover-curate-grid">
      <DiscoverCurateHidden
        key={hiddenKey}
        activeTab={activeTab}
        watchRegion={watchRegion}
        onRestored={() => {
          setHiddenKey((k) => k + 1);
          onReload?.();
        }}
      />
      {feedback && <p className="discover-curate-grid__feedback">{feedback}</p>}
      <div className="movie-grid discover-curate-grid__list discover-curate-grid__list--edit">
        <AnimatePresence mode="popLayout">
          {items.map((movie, index) => {
            const rank = index + 1;
            const showRank = rank <= FEATURED_MAX;
            const isDragging = dragFrom === index;
            const isDropTarget = dragOver === index && dragFrom !== index;

            return (
              <motion.div
                key={movie.id}
                layout
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={[
                  "discover-curate-cell",
                  isDragging && "is-dragging",
                  isDropTarget && "is-drop-target",
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable={!busy}
                onDragStart={(e) => {
                  setDragFrom(index);
                  e.dataTransfer.effectAllowed = "move";
                  if (e.dataTransfer.setDragImage) {
                    const el = e.currentTarget;
                    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 40);
                  }
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnter={() => dragFrom != null && setDragOver(index)}
                onDragLeave={(e) => {
                  if (e.currentTarget === e.target) setDragOver(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(index);
                }}
              >
                {showRank && (
                  <span className="discover-curate-cell__rank" aria-hidden>
                    {rank}
                  </span>
                )}
                <button
                  type="button"
                  className="discover-curate-cell__hide"
                  title="Hide from this list"
                  disabled={busy}
                  onClick={() => hideMovie(movie)}
                >
                  <EyeOff size={15} />
                  <span className="sr-only">Hide</span>
                </button>
                <span className="discover-curate-cell__grip" title="Drag to reorder">
                  <GripVertical size={16} />
                </span>
                <MovieCard
                  movie={movie}
                  index={index}
                  badge={rank === 1 ? "Featured" : undefined}
                  curateMode
                  disableNav
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
