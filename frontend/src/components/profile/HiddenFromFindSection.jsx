import { Link } from "react-router-dom";
import { EyeOff, RotateCcw } from "lucide-react";
import EmptyState from "../common/EmptyState";
import { useHiddenFromFind } from "../../hooks/useHiddenFromFind";
import { formatRating } from "../../utils/format";

export default function HiddenFromFindSection() {
  const { movies, total, loading, remove } = useHiddenFromFind();

  return (
    <section className="profile__section" aria-labelledby="profile-hidden-heading">
      <div className="profile__section-head">
        <h2 id="profile-hidden-heading" className="profile__section-title">
          <EyeOff size={20} /> Already seen
        </h2>
        {total > movies.length && (
          <span className="text-muted profile__hidden-count">{total} titles</span>
        )}
      </div>
      <p className="profile__hidden-note text-muted">
        Titles from &quot;I&apos;ve seen it&quot; on Results. We skip them in Find my movie; Search and Discover are unchanged.
      </p>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : movies.length ? (
        <ul className="hidden-find-list">
          {movies.map((movie) => (
            <li key={movie.id} className="hidden-find-list__item">
              <Link to={`/movie/${movie.id}`} className="hidden-find-list__link">
                {movie.posterUrl ? <img src={movie.posterUrl} alt="" loading="lazy" /> : <span className="hidden-find-list__placeholder" />}
                <span className="hidden-find-list__title">{movie.title}</span>
                {movie.rating != null && <span className="hidden-find-list__rating">{formatRating(movie.rating)}</span>}
              </Link>
              <button
                type="button"
                className="btn btn--ghost btn--sm hidden-find-list__undo"
                onClick={() => remove(movie.id)}
                aria-label={`Suggest ${movie.title} in Find again`}
              >
                <RotateCcw size={14} /> Suggest again
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={EyeOff}
          title="No seen titles yet"
          description='Use “I’ve seen it” on Results. Those movies won’t be suggested again in Find.'
        />
      )}
    </section>
  );
}
