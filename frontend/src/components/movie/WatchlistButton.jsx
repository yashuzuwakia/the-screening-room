import { Bookmark, BookmarkCheck } from "lucide-react";
import { useWatchlist } from "../../hooks/useWatchlist";
import "./movie.css";

export default function WatchlistButton({ movie, variant = "full", className = "" }) {
  const { has, toggle } = useWatchlist();
  const saved = has(movie.id);
  const Icon = saved ? BookmarkCheck : Bookmark;
  const label = saved ? "Saved to watchlist" : "Add to watchlist";

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={`watchlist-icon-btn${saved ? " is-saved" : ""} ${className}`}
        onClick={() => toggle(movie)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
        title={label}
      >
        <Icon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn--secondary btn--lg${saved ? " is-active" : ""} ${className}`}
      onClick={() => toggle(movie)}
      aria-pressed={saved}
    >
      <Icon size={20} />
      <span>{saved ? "Saved" : "Watchlist"}</span>
    </button>
  );
}
