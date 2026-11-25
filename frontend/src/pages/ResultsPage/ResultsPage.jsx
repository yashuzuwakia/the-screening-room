import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Clock, Info, Moon, Play, RotateCcw, SearchX, Sparkles, Star, Wand2 } from "lucide-react";
import Poster from "../../components/movie/Poster";
import VerdictBadge from "../../components/movie/VerdictBadge";
import MovieGrid from "../../components/movie/MovieGrid";
import WatchlistButton from "../../components/movie/WatchlistButton";
import WatchMovieButton from "../../components/movie/WatchMovieButton";
import ScoreBar from "../../components/common/ScoreBar";
import EmptyState from "../../components/common/EmptyState";
import PageLoader from "../../components/common/PageLoader";
import { useResultsRecommendations } from "../../hooks/useResultsRecommendations";
import { useProfile } from "../../hooks/useProfile";
import { useMovieDetails } from "../../hooks/useMovies";
import { fetchSeenTmdbIds } from "../../services/seenApi";
import { explainMatch } from "../../services/recommendationEngine";
import { preferencesFromSearch, preferencesToSearch } from "../../utils/preferences";
import { loadResultsSession, saveResultsSession, sessionMatchesSearch } from "../../utils/resultsSession";
import {
  loadPassedIds,
  loadSeenMovieIds,
  markMovieSeen,
  mergeSeenMovieIds,
  savePassedIds,
} from "../../utils/resultsPasses";
import { prefsTryAnotherMix } from "../../utils/preferenceTweaks";
import { recentPickIdsForPrefs, recordPrefsPick } from "../../utils/recentFindPicks";
import { formatRating, formatRuntime } from "../../utils/format";
import { getMood } from "../../constants/moods";
import MoodIcon from "../../components/common/MoodIcon";
import { getGenreNames } from "../../constants/genres";
import { getPlatform } from "../../constants/platforms";
import { getRuntimeOption, RUNTIMES } from "../../constants/runtimes";
import { fadeUp } from "../../constants/motion";
import "./ResultsPage.css";

const SCORE_LABELS = { mood: "Mood match", genre: "Genre match", runtime: "Runtime match", platform: "Platform match" };

function TryAnotherMixButton({ prefs }) {
  const navigate = useNavigate();
  const nextPrefs = prefsTryAnotherMix(prefs);
  if (!nextPrefs) return null;

  return (
    <div className="results__tweaks">
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => navigate(`/results${preferencesToSearch(nextPrefs)}`, { replace: true })}
      >
        <Wand2 size={16} /> Try another mix
      </button>
    </div>
  );
}

function PreferenceSummary({ prefs }) {
  const mood = getMood(prefs.mood);
  const chips = [
    { key: "mood", label: mood?.label, moodId: prefs.mood },
    ...getGenreNames(prefs.genres).map((name) => ({ key: `genre-${name}`, label: name })),
    ...prefs.platforms.map((id) => ({ key: `platform-${id}`, label: getPlatform(id).name })),
    { key: "runtime", label: getRuntimeOption(prefs.runtime).label },
  ];
  return (
    <ul className="results__prefs" aria-label="Your preferences">
      {chips.map((chip) => (
        <li key={chip.key} className={`chip chip--neutral${chip.moodId ? " chip--with-icon" : ""}`}>
          {chip.moodId ? <MoodIcon moodId={chip.moodId} size={15} className="chip__mood-icon" /> : null}
          {chip.label}
        </li>
      ))}
    </ul>
  );
}

function ResultsView({ search, prefs, resumeLast }) {
  const [passedIds, setPassedIds] = useState(() => loadPassedIds(search));
  const [seenIds, setSeenIds] = useState(() => loadSeenMovieIds());
  const [batchExcludeIds, setBatchExcludeIds] = useState([]);
  const [feedback, setFeedback] = useState({});
  const { watchRegionMeta } = useProfile();
  const activePrefs = useMemo(() => ({ ...prefs, ...feedback }), [prefs, feedback]);

  useEffect(() => {
    let cancelled = false;
    fetchSeenTmdbIds().then((remote) => {
      if (cancelled || !remote?.length) return;
      const merged = mergeSeenMovieIds(remote);
      setSeenIds(new Set(merged));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const savedResumePickId = useMemo(() => {
    if (!resumeLast) return null;
    const session = loadResultsSession();
    if (!sessionMatchesSearch(session, search)) return null;
    const id = Number(session.topPick?.id);
    return Number.isFinite(id) ? id : null;
  }, [resumeLast, search]);

  const recentPrefsPickIds = useMemo(() => {
    const ids = recentPickIdsForPrefs(prefs);
    if (!resumeLast || savedResumePickId == null) return ids;
    return ids.filter((id) => id !== savedResumePickId);
  }, [prefs, resumeLast, savedResumePickId]);

  const excludeIds = useMemo(() => {
    const blocked = new Set([...seenIds, ...passedIds, ...batchExcludeIds, ...recentPrefsPickIds]);
    if (savedResumePickId != null && !seenIds.has(savedResumePickId) && !passedIds.has(savedResumePickId)) {
      blocked.delete(savedResumePickId);
    }
    return [...blocked];
  }, [seenIds, passedIds, batchExcludeIds, recentPrefsPickIds, savedResumePickId]);

  const { data, isLoading, error, requestFreshBatch, canRequestFreshBatch } = useResultsRecommendations(
    activePrefs,
    excludeIds,
  );

  const results = data?.results ?? [];
  const queue = results.filter((m) => !passedIds.has(m.id) && !seenIds.has(m.id));
  const pick =
    savedResumePickId != null
      ? queue.find((m) => m.id === savedResumePickId) ?? queue[0]
      : queue[0];
  const { data: details, isLoading: loadingDetails } = useMovieDetails(pick?.id);

  const skipForThisSearch = (adjustment) => {
    if (!pick) return;
    recordPrefsPick(prefs, pick.id);
    const next = new Set(passedIds);
    next.add(pick.id);
    setPassedIds(next);
    savePassedIds(search, next);
    if (adjustment) setFeedback((previous) => ({ ...previous, ...adjustment }));
  };

  const markSeenAndNext = () => {
    if (!pick) return;
    recordPrefsPick(prefs, pick.id);
    const next = new Set(passedIds);
    next.add(pick.id);
    markMovieSeen(pick.id);
    setSeenIds((prev) => new Set(prev).add(pick.id));
    setPassedIds(next);
    savePassedIds(search, next);
  };

  const promoteToMain = (movie) => {
    if (!movie) return;
    const idx = queue.findIndex((m) => m.id === movie.id);
    if (idx <= 0) return;
    const next = new Set(passedIds);
    for (let i = 0; i < idx; i += 1) next.add(queue[i].id);
    setPassedIds(next);
    savePassedIds(search, next);
  };

  useEffect(() => {
    if (pick && prefs) {
      saveResultsSession({ prefs, search, topPick: pick });
    }
  }, [pick, prefs, search]);

  useEffect(() => {
    const currentPick = pick?.id;
    const currentPrefs = prefs;
    return () => {
      if (currentPick && currentPrefs) recordPrefsPick(currentPrefs, currentPick);
    };
  }, [pick?.id, prefs]);

  const findMore = () => {
    setBatchExcludeIds((previous) => [...new Set([...previous, ...results.map((movie) => movie.id)])]);
    requestFreshBatch();
  };

  if (isLoading) return <PageLoader label="Finding matches for your preferences..." />;

  if (error) {
    return (
      <EmptyState
        icon={SearchX}
        tone="error"
        title="Something went wrong"
        description="We couldn't reach the movie database. Please try again."
      >
        <Link to="/find" className="btn btn--primary">
          <RotateCcw size={16} /> Start over
        </Link>
      </EmptyState>
    );
  }

  if (!pick) {
    const passedAll = results.length > 0 && passedIds.size > 0;
    return (
      <>
        <motion.div className="results__topbar" {...fadeUp()}>
          <Link to="/find" className="btn btn--ghost">
            <RotateCcw size={16} /> Start over
          </Link>
        </motion.div>
        <PreferenceSummary prefs={activePrefs} />
        <EmptyState
          icon={SearchX}
          title={passedAll ? "No more picks in this list" : "No matches found"}
          description={
            passedAll
              ? "You passed on every suggestion for these preferences. Try a small tweak or browse alternatives below."
              : "Try loosening your genre or platform choices."
          }
        >
          {canRequestFreshBatch && passedIds.size > 0 && (
            <button type="button" className="btn btn--secondary" onClick={findMore}>Find more picks</button>
          )}
          <TryAnotherMixButton prefs={activePrefs} />
          <Link to="/find" className="btn btn--primary">
            <RotateCcw size={16} /> Adjust preferences
          </Link>
        </EmptyState>
        {results.length > 0 && (
          <section className="results__alternatives">
            <h2 className="section-title">Still worth a look</h2>
            <MovieGrid movies={results.filter((m) => !seenIds.has(m.id))} getBadge={(m) => `${m.match}% match`} size="large" />
          </section>
        )}
      </>
    );
  }

  const movie = { ...pick, ...(details?.id === pick.id ? details : {}) };
  const alternatives = queue.filter((candidate) => candidate.id !== pick.id);
  const offlineAvailability = movie.availabilitySource === "offline";
  const selectedProviderIds = new Set(activePrefs.platforms.flatMap((id) => getPlatform(id)?.providerIds ?? []));
  const providers = offlineAvailability ? [] : movie.providers?.toSorted(
    (a, b) => Number(selectedProviderIds.has(b.id)) - Number(selectedProviderIds.has(a.id)),
  );
  const runtime = movie.runtime;
  const limit = getRuntimeOption(activePrefs.runtime).maxMinutes ?? Infinity;
  const shorter = RUNTIMES.findLast((option) => option.maxMinutes && option.maxMinutes < Math.min(limit, runtime ?? Infinity));
  const lightMood = getMood("relaxing");
  const pickPosition = results.length - queue.length + 1;

  return (
    <>
      <motion.div className="results__topbar" {...fadeUp()}>
        <Link to="/find" className="btn btn--ghost">
          <RotateCcw size={16} /> Start over
        </Link>
        <p className="results__stats">
          Scored <strong>{data.candidateCount}</strong> movies in{" "}
          <strong>{(data.elapsedMs / 1000).toFixed(1)}s</strong>
          {recentPrefsPickIds.length > 0 && (
            <span className="chip chip--neutral" title="Titles from an earlier run with the same preferences">
              Skipped {recentPrefsPickIds.length} recent
            </span>
          )}
          {data.source === "offline" && <span className="chip chip--neutral">Offline catalog</span>}
        </p>
      </motion.div>

      <PreferenceSummary prefs={activePrefs} />

      <motion.article key={movie.id} className="match" {...fadeUp(0.08, 24)}>
        {movie.backdropUrl && (
          <div className="match__backdrop" style={{ backgroundImage: `url(${movie.backdropUrl})` }} aria-hidden="true" />
        )}
        <div className="match__inner">
          <div className="match__poster">
            <Poster src={movie.posterUrl} title={movie.title} eager />
          </div>

          <div className="match__details">
            <div className="match__label">
              <Sparkles size={16} /> Tonight&apos;s pick
              <span className="match__score">{pick.match}% match</span>
              {results.length > 1 && (
                <span className="match__pick-rank text-muted">
                  {pickPosition} of {results.length}
                </span>
              )}
            </div>

            <h1 className="match__title">{movie.title}</h1>
            {movie.tagline && <p className="match__tagline">{movie.tagline}</p>}

            <div className="match__meta">
              {movie.rating && (
                <span className="match__rating" title="TMDB score">
                  <Star size={18} fill="currentColor" /> {formatRating(movie.rating)}
                  <span className="text-muted"> TMDB</span>
                </span>
              )}
              <VerdictBadge movie={movie} variant="inline" />
              {movie.year && <span>{movie.year}</span>}
              {runtime && (
                <span className="match__meta-item">
                  <Clock size={16} /> {formatRuntime(runtime)}
                </span>
              )}
            </div>

            <div className="match__genres">
              {getGenreNames(movie.genreIds).map((genre) => (
                <span key={genre} className="chip">
                  {genre}
                </span>
              ))}
            </div>

            {(movie.director || movie.cast?.length > 0) && (
              <dl className="match__credits">
                {movie.director && (
                  <div>
                    <dt>Director</dt>
                    <dd>{movie.director}</dd>
                  </div>
                )}
                {movie.cast?.length > 0 && (
                  <div>
                    <dt>Starring</dt>
                    <dd>{movie.cast.slice(0, 3).map((c) => c.name).join(", ")}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="match__why">
              <p className="match__why-title">
                <Sparkles size={16} /> Why we picked it
              </p>
              <p>{explainMatch(pick, activePrefs, details?.id === pick.id && details.availabilitySource !== "offline" ? details : null)}</p>
            </div>

            <div className="match__availability">
              <p className="match__why-title">Where to watch in {watchRegionMeta.label}</p>
              {pick.platformFilterRelaxed && <p className="text-muted">We expanded this search beyond your selected streaming services.</p>}
              {!loadingDetails && !providers?.length && (
                <p className="text-muted">{providers && !offlineAvailability ? "No subscription providers listed for this title in your region." : "Check JustWatch for current availability."}</p>
              )}
              <WatchMovieButton movie={movie} size="lg" mode="button" providers={providers} />
            </div>

            <motion.div className="match__pass" {...fadeUp(0.12)}>
              <p className="match__pass-lead">Not the one?</p>
              <div className="match__pass-actions">
                <button type="button" className="btn btn--secondary" onClick={markSeenAndNext}>
                  <Check size={16} /> I&apos;ve seen it
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => skipForThisSearch()}>
                  <Moon size={16} /> Not tonight
                </button>
                {shorter && (
                  <button type="button" className="btn btn--secondary" onClick={() => skipForThisSearch({ runtime: shorter.id })}>
                    <Clock size={16} /> Something shorter
                  </button>
                )}
                {activePrefs.mood !== lightMood.id && (
                  <button type="button" className="btn btn--secondary" onClick={() => skipForThisSearch({ mood: lightMood.id, genres: lightMood.genreIds })}>
                    <Moon size={16} /> Something lighter
                  </button>
                )}
              </div>
              <p className="match__pass-hint text-muted">
                Seen titles stay off Find (manage under Profile → Already seen). Not tonight is only for this search.
              </p>
              {queue.length > 1 && (
                <p className="match__pass-queue text-muted">{queue.length - 1} more ranked picks after this.</p>
              )}
              <TryAnotherMixButton prefs={prefs} />
            </motion.div>

            <div className="match__actions">
              {movie.trailerUrl ? (
                <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn--secondary btn--lg">
                  <Play size={18} fill="currentColor" /> Trailer
                </a>
              ) : (
                <Link to={`/movie/${movie.id}`} className="btn btn--secondary btn--lg">
                  <Info size={18} /> Full details
                </Link>
              )}
              <WatchlistButton movie={movie} />
            </div>
          </div>
        </div>
      </motion.article>

      <motion.section className="results__scores" {...fadeUp(0.2)}>
        <h2 className="section-title">How it matches</h2>
        <div className="results__score-grid">
          {Object.entries(SCORE_LABELS).map(([key, label], i) => (
            <ScoreBar key={key} label={label} value={pick.breakdown[key]} delay={0.4 + i * 0.1} />
          ))}
        </div>
      </motion.section>

      {alternatives.length > 0 && (
        <section className="results__alternatives">
          <h2 className="section-title">You might also like</h2>
          <p className="text-muted results__alt-hint">Tap a poster to swap it to the top pick for the same search.</p>
          <MovieGrid
            movies={alternatives}
            getBadge={(m) => `${m.match}% match`}
            size="large"
            onSelectMovie={promoteToMain}
          />
        </section>
      )}
    </>
  );
}

export default function ResultsPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const prefs = preferencesFromSearch(params);
  const resumeLast = params.get("resume") === "1";

  return (
    <div className="container page results">
      {prefs ? (
        <ResultsView key={search} search={search} prefs={prefs} resumeLast={resumeLast} />
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Let's find your movie first"
          description="Answer four quick questions and we'll pick the perfect movie for tonight."
        >
          <Link to="/find" className="btn btn--primary">
            Start matching
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
