import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { History, SearchX } from "lucide-react";
import MovieGrid from "../../components/movie/MovieGrid";
import EmptyState from "../../components/common/EmptyState";
import MovieSearchBar from "../../components/common/MovieSearchBar";
import DropdownSelect from "../../components/common/DropdownSelect";
import { useMovieSearch } from "../../hooks/useMovies";
import { useProfile } from "../../hooks/useProfile";
import { SEARCH_SORT_OPTIONS } from "../../utils/movieSearch";
import { pushRecentMovieSearch, readRecentMovieSearches } from "../../utils/recentMovieSearches";
import "./Search.css";

const MIN_RATING_OPTIONS = [
  { value: "", label: "Any rating", hint: "All scores" },
  { value: "6", label: "6.0+", hint: "Decent picks" },
  { value: "7", label: "7.0+", hint: "Well reviewed" },
  { value: "8", label: "8.0+", hint: "Top tier" },
];

function buildYearOptions() {
  const current = new Date().getFullYear();
  const opts = [{ value: "", label: "Any year", hint: "All releases" }];
  for (let y = current; y >= current - 35; y -= 1) {
    opts.push({ value: String(y), label: String(y), hint: "Release year" });
  }
  return opts;
}

const YEAR_OPTIONS = buildYearOptions();

function readSearchParams(searchParams) {
  const q = (searchParams.get("q") ?? "").trim();
  const sort = searchParams.get("sort") ?? "relevance";
  const year = searchParams.get("year") ?? "";
  const minRating = searchParams.get("minRating") ?? "";
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  return { q, sort, year, minRating, page };
}

function writeSearchParams(prev, changes) {
  const next = new URLSearchParams(prev);
  Object.entries(changes).forEach(([key, value]) => {
    if (value === "" || value == null || (key === "page" && Number(value) <= 1)) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  });
  if (!("page" in changes) && ("q" in changes || "sort" in changes || "year" in changes || "minRating" in changes)) {
    next.delete("page");
  }
  return next;
}

export default function Search() {
  const { watchRegionMeta } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { q: urlQuery, sort, year, minRating, page } = useMemo(
    () => readSearchParams(searchParams),
    [searchParams],
  );

  const [inputQuery, setInputQuery] = useState(urlQuery);
  const [recentSearches, setRecentSearches] = useState(() => readRecentMovieSearches());
  const [pageCache, setPageCache] = useState(null);
  const skipDebounceRef = useRef(false);
  const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery);

  if (urlQuery !== previousUrlQuery) {
    setPreviousUrlQuery(urlQuery);
    if (urlQuery.length >= 2) setInputQuery(urlQuery);
  }
  const listKey = JSON.stringify([urlQuery, sort, year, minRating, watchRegionMeta.code]);

  const commitSearch = useCallback(
    (raw) => {
      const q = raw.trim();
      setInputQuery(q);
      skipDebounceRef.current = true;
      if (q.length >= 2) setRecentSearches(pushRecentMovieSearch(q));
      const next = writeSearchParams(searchParams, { q: q.length >= 2 ? q : "" });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (skipDebounceRef.current) {
        skipDebounceRef.current = false;
        return;
      }
      const q = inputQuery.trim();
      if (q === urlQuery) return;
      if (q.length < 2) {
        if (urlQuery) setSearchParams(writeSearchParams(searchParams, { q: "", page: 1 }), { replace: true });
        return;
      }
      setSearchParams(writeSearchParams(searchParams, { q }), { replace: true });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [inputQuery, urlQuery, searchParams, setSearchParams]);

  const activeQuery = urlQuery.length >= 2 ? urlQuery : "";
  const { data, isLoading, error } = useMovieSearch(activeQuery, { sort, year, minRating, page });

  const cachedMovies = pageCache?.key === listKey ? pageCache.movies : [];
  if (data?.movies && (pageCache?.key !== listKey || pageCache.data !== data)) {
    const seen = new Set(cachedMovies.map((movie) => movie.id));
    const movies = page <= 1 ? data.movies : [...cachedMovies, ...data.movies.filter((movie) => !seen.has(movie.id))];
    setPageCache({ key: listKey, data, movies });
  }

  const updateFilters = (changes) => {
    setSearchParams(writeSearchParams(searchParams, changes), { replace: true });
  };

  const movies = cachedMovies;
  const totalResults = data?.totalResults ?? movies.length;
  const hasMore = Boolean(data?.hasMore);
  const loadingMore = isLoading && page > 1;

  return (
    <div className="page search">
      <div className="container search__header">
        <span className="eyebrow">Find a title</span>
        <h1 className="search__title">Search movies</h1>
        <p className="text-muted search__lede">
          Smart matching on titles, filters by year and rating, and quick picks as you type in the header.
        </p>
        <div className="search__bar-wrap">
          <MovieSearchBar
            className="movie-search--hero"
            id="search-page-input"
            placeholder="Title, keyword, or partial name…"
            value={inputQuery}
            onChange={setInputQuery}
            onSearchSubmit={commitSearch}
            showSuggestions
          />
        </div>

        {recentSearches.length > 0 && (
          <div className="search__recent" aria-label="Recent searches">
            <span className="search__recent-label">
              <History size={14} aria-hidden /> Recent
            </span>
            <div className="search__recent-chips">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="search__recent-chip"
                  onClick={() => commitSearch(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="container search__body">
        {activeQuery.length < 2 ? (
          <EmptyState
            icon={SearchX}
            title="Start typing"
            description="Enter at least two characters — try a title, franchise, or actor-related keyword."
          >
            <Link to="/discover" className="btn btn--ghost">
              Browse Discover
            </Link>
          </EmptyState>
        ) : (
          <>
            <div className="search__controls">
              <DropdownSelect
                id="search-sort"
                label="Sort"
                compact
                value={sort}
                onChange={(value) => updateFilters({ sort: value })}
                options={SEARCH_SORT_OPTIONS}
              />
              <DropdownSelect
                id="search-year"
                label="Year"
                compact
                value={year}
                onChange={(value) => updateFilters({ year: value })}
                options={YEAR_OPTIONS}
                menuAlign="end"
              />
              <DropdownSelect
                id="search-rating"
                label="Min rating"
                compact
                value={minRating}
                onChange={(value) => updateFilters({ minRating: value })}
                options={MIN_RATING_OPTIONS}
                menuAlign="end"
              />
            </div>

            {error ? (
              <EmptyState icon={SearchX} tone="error" title="Search failed" description="Check your connection and try again." />
            ) : isLoading && page === 1 && movies.length === 0 ? (
              <MovieGrid movies={[]} isLoading skeletonCount={12} />
            ) : !isLoading && movies.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No matches"
                description={`Nothing found for “${activeQuery}” with these filters. Try another year or lower the rating floor.`}
              />
            ) : (
              <>
                <p className="search__meta text-muted">
                  {isLoading && page === 1
                    ? "Searching…"
                    : (
                        <>
                          Showing {movies.length.toLocaleString()} of {totalResults.toLocaleString()} for “
                          {activeQuery}” in {watchRegionMeta.label} {watchRegionMeta.flag} (
                          <Link to="/discover">change on Discover</Link>)
                        </>
                      )}
                </p>
                <MovieGrid movies={movies} isLoading={isLoading && page === 1} skeletonCount={12} />
                {hasMore && (
                  <div className="search__more">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={loadingMore}
                      onClick={() => updateFilters({ page: page + 1 })}
                    >
                      {loadingMore ? "Loading…" : "Load more results"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
