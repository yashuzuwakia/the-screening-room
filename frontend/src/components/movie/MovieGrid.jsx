import MovieCard from "./MovieCard";
import "./movie.css";

export default function MovieGrid({
  movies = [],
  isLoading = false,
  skeletonCount = 12,
  getBadge,
  size = "default",
  onSelectMovie,
}) {
  const className = `movie-grid movie-grid--${size}`;

  if (isLoading) {
    return (
      <div className={className} aria-busy="true" aria-label="Loading movies">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="movie-card-skeleton">
            <div className="skeleton movie-card-skeleton__poster" />
            <div className="skeleton movie-card-skeleton__line" />
            <div className="skeleton movie-card-skeleton__line movie-card-skeleton__line--short" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {movies.map((movie, index) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          index={index}
          badge={getBadge?.(movie)}
          onSelect={onSelectMovie ? () => onSelectMovie(movie) : undefined}
        />
      ))}
    </div>
  );
}
