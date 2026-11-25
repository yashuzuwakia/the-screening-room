import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useProfile } from "../../hooks/useProfile";
import { getMovieDetails } from "../../services/movieService";
import { justWatchSearchUrl } from "../../utils/streamingLinks";
import "./WatchMovieButton.css";

function WatchMovieMenu({ id, movie, watchRegion, watchRegionMeta, providers, loading, onClose }) {
  const justWatch = justWatchSearchUrl(movie.title, watchRegion);

  return (
    <div id={id} className="watch-menu" role="dialog" aria-label={`Where to watch ${movie.title}`}>
      <p className="watch-menu__label">
        Stream in {watchRegionMeta.label} {watchRegionMeta.flag}
      </p>
      {loading && <p className="watch-menu__status text-muted">Loading services…</p>}
      {!loading && providers.length === 0 && (
        <p className="watch-menu__status text-muted">No flat-rate services listed — try JustWatch.</p>
      )}
      <ul className="watch-menu__list">
        {providers.map((p) => (
          <li key={p.id ?? p.name}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="watch-menu__link"
              onClick={onClose}
            >
              {p.logoUrl ? <img src={p.logoUrl} alt="" className="watch-menu__logo" /> : <span>{p.name}</span>}
              <span className="watch-menu__name">{p.name}</span>
              <ExternalLink size={14} aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <a
        href={justWatch}
        target="_blank"
        rel="noopener noreferrer"
        className="watch-menu__fallback"
        onClick={onClose}
      >
        Search on JustWatch
        <ExternalLink size={14} aria-hidden />
      </a>
    </div>
  );
}

/**
 * @param {"sm"|"md"|"lg"} size
 * @param {"button"|"menu"} mode — menu only opens panel; button includes primary outbound link when providers known
 */
export default function WatchMovieButton({
  movie,
  className = "",
  size = "sm",
  mode = "menu",
  providers: providersProp,
  showLabel = true,
}) {
  const { watchRegion, watchRegionMeta } = useProfile();
  const [open, setOpen] = useState(false);
  const listedProviders = providersProp ?? movie.providers;
  const rootRef = useRef(null);
  const shouldFetch = open && listedProviders == null;
  const loadProviders = useCallback(
    () => shouldFetch ? getMovieDetails(movie.id, watchRegion) : Promise.resolve(null),
    [shouldFetch, movie.id, watchRegion],
  );
  const { data, isLoading } = useAsync(loadProviders);
  const providers = listedProviders ?? data?.providers ?? [];
  const loading = shouldFetch && isLoading;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen((v) => !v);
  };

  const primary = providers[0];
  const primaryHref =
    primary?.url ?? (movie.title ? justWatchSearchUrl(movie.title, watchRegion) : null);

  if (mode === "button" && primaryHref) {
    return (
      <div className={`watch-movie watch-movie--${size} ${className}`.trim()} ref={rootRef}>
        <a
          href={primaryHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn--primary${size === "lg" ? " btn--lg" : size === "md" ? "" : " btn--sm"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Play size={size === "lg" ? 18 : 14} fill="currentColor" />
          {primary ? `Watch on ${primary.name}` : "Where to watch"}
        </a>
        <button
          type="button"
          className={`btn btn--ghost btn--sm watch-movie__more${open ? " is-active" : ""}`}
          onClick={toggle}
          aria-expanded={open}
          aria-controls={open ? `watch-menu-${movie.id}` : undefined}
        >
          More
        </button>
        {open && (
          <WatchMovieMenu
            id={`watch-menu-${movie.id}`}
            movie={movie}
            watchRegion={watchRegion}
            watchRegionMeta={watchRegionMeta}
            providers={providers}
            loading={loading}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`watch-movie watch-movie--${size} ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className={`watch-movie__trigger watch-movie__trigger--${size}`}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Play size={size === "lg" ? 16 : 13} fill="currentColor" />
        {showLabel && (size === "lg" ? "Where to watch" : "Watch")}
      </button>
      {open && (
        <WatchMovieMenu
          movie={movie}
          watchRegion={watchRegion}
          watchRegionMeta={watchRegionMeta}
          providers={providers}
          loading={loading}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
