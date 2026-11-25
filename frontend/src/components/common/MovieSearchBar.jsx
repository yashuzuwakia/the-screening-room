import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Star } from "lucide-react";
import { useMovieSuggest } from "../../hooks/useMovies";
import { pushRecentMovieSearch } from "../../utils/recentMovieSearches";
import { formatRating } from "../../utils/format";
import "./MovieSearchBar.css";

export default function MovieSearchBar({
  className = "",
  id: idProp,
  placeholder = "Search movies…",
  value: valueProp,
  onChange,
  onSearchSubmit,
  showSuggestions = false,
}) {
  const generatedId = useId();
  const listId = useId();
  const inputId = idProp ?? generatedId;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isControlled = valueProp !== undefined;
  const urlValue = !isControlled && location.pathname === "/search" ? searchParams.get("q") ?? "" : null;
  const [previousUrlValue, setPreviousUrlValue] = useState(urlValue);
  const [internalValue, setInternalValue] = useState(urlValue ?? "");
  if (urlValue !== previousUrlValue) {
    setPreviousUrlValue(urlValue);
    if (urlValue !== null) setInternalValue(urlValue);
  }
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const value = isControlled ? valueProp : internalValue;

  const setValue = (next) => {
    if (isControlled) onChange?.(next);
    else setInternalValue(next);
  };

  const trimmed = value.trim();
  const suggestEnabled = showSuggestions && trimmed.length >= 2;
  const { data: suggestData, isLoading: suggestLoading } = useMovieSuggest(trimmed, {
    enabled: suggestEnabled && open,
    limit: 8,
  });
  const suggestions = suggestEnabled && open ? (suggestData?.suggestions ?? []) : [];

  useEffect(() => {
    if (!showSuggestions) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showSuggestions]);

  const suggestionKey = JSON.stringify([trimmed, suggestions.length]);
  const [previousSuggestionKey, setPreviousSuggestionKey] = useState(suggestionKey);
  if (suggestionKey !== previousSuggestionKey) {
    setPreviousSuggestionKey(suggestionKey);
    setActiveIndex(-1);
  }

  const recordRecent = (q) => {
    if (q.length >= 2) pushRecentMovieSearch(q);
  };

  const goToSearch = (raw) => {
    const q = raw.trim();
    recordRecent(q);
    if (q.length < 2) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const goToMovie = (id) => {
    setOpen(false);
    navigate(`/movie/${id}`);
  };

  const commit = (raw) => {
    const q = raw.trim();
    recordRecent(q);
    if (onSearchSubmit) {
      onSearchSubmit(q);
      setOpen(false);
      return;
    }
    goToSearch(q);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToMovie(suggestions[activeIndex].id);
      return;
    }
    commit(value);
  };

  const onKeyDown = (event) => {
    if (!showSuggestions || !open || !suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`movie-search-wrap${showSuggestions ? " movie-search-wrap--suggest" : ""}`} ref={rootRef}>
      <form className={`movie-search ${className}`.trim()} role="search" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor={inputId}>
          Search movies
        </label>
        <Search size={18} className="movie-search__icon" aria-hidden />
        <input
          id={inputId}
          type="search"
          name="q"
          className="movie-search__input"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (showSuggestions) setOpen(true);
          }}
          onFocus={() => showSuggestions && setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showSuggestions && open && suggestions.length > 0}
          aria-controls={showSuggestions ? listId : undefined}
          aria-autocomplete="list"
        />
      </form>

      {showSuggestions && open && trimmed.length >= 2 && (
        <div className="movie-search-suggest" role="presentation">
          {suggestLoading && suggestions.length === 0 && (
            <p className="movie-search-suggest__status text-muted">Searching…</p>
          )}
          {!suggestLoading && suggestions.length === 0 && (
            <p className="movie-search-suggest__status text-muted">No quick matches — press Enter for full search.</p>
          )}
          {suggestions.length > 0 && (
            <ul className="movie-search-suggest__list" id={listId} role="listbox">
              {suggestions.map((movie, index) => (
                <li key={movie.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`movie-search-suggest__item${index === activeIndex ? " is-active" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToMovie(movie.id)}
                  >
                    {movie.posterUrl ? (
                      <img src={movie.posterUrl} alt="" className="movie-search-suggest__thumb" loading="lazy" />
                    ) : (
                      <span className="movie-search-suggest__thumb movie-search-suggest__thumb--empty" />
                    )}
                    <span className="movie-search-suggest__body">
                      <span className="movie-search-suggest__title">{movie.title}</span>
                      <span className="movie-search-suggest__meta text-muted">
                        {[movie.year, movie.rating ? `${formatRating(movie.rating)} TMDB` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {movie.rating != null && (
                      <span className="movie-search-suggest__rating">
                        <Star size={12} fill="currentColor" aria-hidden />
                        {formatRating(movie.rating)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              <li className="movie-search-suggest__footer" role="presentation">
                <Link
                  to={`/search?q=${encodeURIComponent(trimmed)}`}
                  className="movie-search-suggest__all"
                  onClick={() => {
                    recordRecent(trimmed);
                    setOpen(false);
                  }}
                >
                  See all results for “{trimmed}”
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
