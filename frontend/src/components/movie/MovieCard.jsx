import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";
import Poster from "./Poster";
import WatchlistButton from "./WatchlistButton";
import { getGenreName } from "../../constants/genres";
import { staggerIn } from "../../constants/motion";
import { formatRating } from "../../utils/format";
import VerdictBadge from "./VerdictBadge";
import "./movie.css";

export default function MovieCard({
  movie,
  index = 0,
  badge,
  curateMode = false,
  disableNav = false,
  onSelect,
}) {
  const genre = getGenreName(movie.genreIds?.[0]);
  const linkProps = onSelect
    ? {
        to: "#",
        onClick: (e) => {
          e.preventDefault();
          onSelect(movie);
        },
      }
    : disableNav
      ? {
          to: "#",
          onClick: (e) => {
            e.preventDefault();
          },
          "aria-disabled": true,
        }
      : { to: `/movie/${movie.id}` };

  return (
    <motion.article
      className={`movie-card${curateMode ? " movie-card--curate" : ""}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={staggerIn(index)}
    >
      <Link {...linkProps} className="movie-card__link">
        <div className="movie-card__poster">
          <Poster src={movie.posterUrl} title={movie.title} />
          <VerdictBadge movie={movie} variant="poster" />
          {badge && <span className="movie-card__badge movie-card__badge--promo">{badge}</span>}
          <div className="movie-card__overlay">
            {movie.overview && <p className="movie-card__overview">{movie.overview}</p>}
            <div className="movie-card__overlay-actions">
              <span className="movie-card__cta">
                <Play size={14} fill="currentColor" />
                View details
              </span>
            </div>
          </div>
        </div>
        <div className="movie-card__meta">
          <h3 className="movie-card__title">{movie.title}</h3>
          <div className="movie-card__sub">
            <span className="movie-card__info">{[movie.year, genre].filter(Boolean).join(" · ")}</span>
            <span className="movie-card__ratings">
              {movie.rating && (
                <span className="movie-card__rating" title="TMDB score">
                  <Star size={13} fill="currentColor" />
                  {formatRating(movie.rating)}
                </span>
              )}
              <VerdictBadge movie={movie} variant="inline" />
            </span>
          </div>
        </div>
      </Link>
      <WatchlistButton movie={movie} variant="icon" className="movie-card__save" />
    </motion.article>
  );
}
