import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Film, Play, Star, UserRound } from "lucide-react";
import Poster from "../../components/movie/Poster";
import MovieGrid from "../../components/movie/MovieGrid";
import WatchlistButton from "../../components/movie/WatchlistButton";
import EmptyState from "../../components/common/EmptyState";
import PageLoader from "../../components/common/PageLoader";
import { useMovieDetails } from "../../hooks/useMovies";
import { useProfile } from "../../hooks/useProfile";
import { getGenreNames } from "../../constants/genres";
import { fadeUp } from "../../constants/motion";
import { formatCompact, formatDate, formatRating, formatRuntime } from "../../utils/format";
import CommunityRating from "../../components/movie/CommunityRating";
import VerdictBadge from "../../components/movie/VerdictBadge";
import MovieDiscussion from "../../components/movie/MovieDiscussion";
import MovieDiscoverAdmin from "../../components/discover/MovieDiscoverAdmin";
import { providerWatchUrl } from "../../utils/streamingLinks.js";
import "./MovieDetails.css";

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { watchRegion, watchRegionMeta } = useProfile();
  const { data: movie, isLoading, error } = useMovieDetails(id);
  const [crowdOverride, setCrowdOverride] = useState(null);

  const movieWithCrowd = useMemo(() => {
    if (!movie) return null;
    const useOverride = crowdOverride && crowdOverride.movieId === movie.id;
    return {
      ...movie,
      communityRating: useOverride ? crowdOverride.communityRating : movie.communityRating,
      communityCount: useOverride ? crowdOverride.communityCount : movie.communityCount ?? 0,
    };
  }, [movie, crowdOverride]);

  if (isLoading) return <PageLoader />;

  if (error || !movie || !movieWithCrowd) {
    return (
      <div className="container page">
        <EmptyState icon={Film} tone="error" title="Movie not found" description={error?.message}>
          <Link to="/discover" className="btn btn--primary">
            Browse movies
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="details">
      <section className="details__hero">
        {movie.backdropUrl && (
          <div className="details__backdrop" style={{ backgroundImage: `url(${movie.backdropUrl})` }} aria-hidden="true" />
        )}
        <div className="details__shade" aria-hidden="true" />

        <div className="container details__hero-inner">
          <button type="button" className="btn btn--ghost details__back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>

          <div className="details__layout">
            <motion.div className="details__poster" {...fadeUp(0, 28)}>
              <Poster src={movie.posterUrl} title={movie.title} eager />
            </motion.div>

            <motion.div className="details__info" {...fadeUp(0.12, 28)}>
              <div className="details__genres">
                {getGenreNames(movie.genreIds).map((genre) => (
                  <span key={genre} className="chip">
                    {genre}
                  </span>
                ))}
              </div>

              <h1 className="details__title">{movie.title}</h1>
              {movie.tagline && <p className="details__tagline">“{movie.tagline}”</p>}

              <div className="details__meta">
                {movie.rating && (
                  <span className="details__rating">
                    <Star size={20} fill="currentColor" />
                    <strong>{formatRating(movie.rating)}</strong>
                    <span className="text-muted">/ 10 TMDB</span>
                    {movie.voteCount > 0 && (
                      <span className="details__votes">({formatCompact(movie.voteCount)} votes)</span>
                    )}
                  </span>
                )}
                <VerdictBadge movie={movieWithCrowd} variant="inline" />
                {movie.releaseDate && (
                  <span className="details__meta-item">
                    <Calendar size={16} /> {formatDate(movie.releaseDate)}
                  </span>
                )}
                {movie.runtime && (
                  <span className="details__meta-item">
                    <Clock size={16} /> {formatRuntime(movie.runtime)}
                  </span>
                )}
              </div>

              {movie.overview && <p className="details__overview">{movie.overview}</p>}

              <MovieDiscoverAdmin movie={movie} />

              <CommunityRating
                movieId={movie.id}
                communityRating={movieWithCrowd.communityRating}
                communityCount={movieWithCrowd.communityCount}
                initialUserRating={movie.userRating}
                onCommunityChange={(stats) => setCrowdOverride({ movieId: movie.id, ...stats })}
              />

              {movie.director && (
                <p className="details__director">
                  Directed by <strong>{movie.director}</strong>
                </p>
              )}

              <div className="details__actions">
                {movie.trailerUrl && (
                  <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn--primary btn--lg">
                    <Play size={18} fill="currentColor" /> Watch trailer
                  </a>
                )}
                <WatchlistButton movie={movie} />
              </div>

              {(movie.providers ?? []).length > 0 && (
                <div className="details__providers">
                  <p className="details__label">
                    Stream in {watchRegionMeta.label} {watchRegionMeta.flag}
                  </p>
                  <ul>
                    {movie.providers.map((provider) => (
                      <li key={provider.id}>
                        <a
                          href={
                            provider.url ??
                            providerWatchUrl({
                              providerId: provider.id,
                              providerName: provider.name,
                              title: movie.title,
                              region: watchRegion,
                            })
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="details__provider-link"
                          title={`Open on ${provider.name}`}
                        >
                          {provider.logoUrl ? (
                            <img src={provider.logoUrl} alt="" loading="lazy" />
                          ) : (
                            <span className="chip chip--neutral">{provider.name}</span>
                          )}
                          <span className="visually-hidden">{provider.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="details__section">
          <MovieDiscussion movieId={movie.id} movieTitle={movie.title} />
        </section>

        {(movie.cast ?? []).length > 0 && (
          <section className="details__section">
            <h2 className="section-title">Top cast</h2>
            <ul className="cast-list">
              {movie.cast.map((person) => (
                <li key={person.id} className="cast-card">
                  {person.photoUrl ? (
                    <img src={person.photoUrl} alt={person.name} loading="lazy" className="cast-card__photo" />
                  ) : (
                    <span className="cast-card__photo cast-card__photo--empty">
                      <UserRound size={28} />
                    </span>
                  )}
                  <p className="cast-card__name">{person.name}</p>
                  {person.character && <p className="cast-card__role">{person.character}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(movie.similar ?? []).length > 0 && (
          <section className="details__section">
            <h2 className="section-title">More like this</h2>
            <MovieGrid movies={movie.similar} />
          </section>
        )}
      </div>
    </div>
  );
}
