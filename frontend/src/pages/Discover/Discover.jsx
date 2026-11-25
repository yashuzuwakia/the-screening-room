import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clapperboard,
  Drama,
  Flame,
  Ghost,
  Globe,
  Heart,
  Laugh,
  MapPin,
  Rocket,
  SearchX,
  Star,
  TrendingUp,
  WandSparkles,
  Calendar,
} from "lucide-react";
import MovieGrid from "../../components/movie/MovieGrid";
import EmptyState from "../../components/common/EmptyState";
import { useMovieList } from "../../hooks/useMovies";
import { useProfile } from "../../hooks/useProfile";
import DropdownSelect from "../../components/common/DropdownSelect";
import { REGIONS } from "../../constants/regions";
import DiscoverCurateBar from "../../components/discover/DiscoverCurateBar";
import DiscoverCurateGrid from "../../components/discover/DiscoverCurateGrid";
import { mergeFeaturedOrder } from "../../utils/discoverFeaturedOrder";
import {
  canCurateDiscoverTab,
  discoverCurateSlot,
  isGlobalDiscoverTab,
} from "../../utils/discoverCurateSlot";
import { resetDiscoverPins } from "../../services/adminApi";
import "./Discover.css";

const SORT_OPTIONS = [
  { value: "popular", label: "Most popular", hint: "Buzz & trending", Icon: TrendingUp },
  { value: "rating", label: "Highest rated", hint: "TMDB score", Icon: Star },
  { value: "newest", label: "Newest", hint: "Release date", Icon: Calendar },
];

const REGION_OPTIONS = REGIONS.map((r) => ({
  value: r.code,
  label: r.label,
  flag: r.flag,
}));

const TABS = [
  { id: "trending", label: "Global", Icon: Globe, genreId: null, scope: "global" },
  { id: "local", label: "Your country", Icon: MapPin, genreId: null, scope: "regional" },
  { id: "action", label: "Action", Icon: Flame, genreId: 28 },
  { id: "comedy", label: "Comedy", Icon: Laugh, genreId: 35 },
  { id: "drama", label: "Drama", Icon: Drama, genreId: 18 },
  { id: "horror", label: "Horror", Icon: Ghost, genreId: 27 },
  { id: "romance", label: "Romance", Icon: Heart, genreId: 10749 },
  { id: "scifi", label: "Sci-Fi", Icon: Rocket, genreId: 878 },
  { id: "documentary", label: "Documentary", Icon: Clapperboard, genreId: 99 },
];

const SORTS = {
  popular: { label: "Most popular", compare: (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) },
  rating: {
    label: "Highest rated",
    compare: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.voteCount ?? 0) - (a.voteCount ?? 0),
  },
  newest: {
    label: "Newest",
    compare: (a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""),
  },
};

/** Browse mode: admin pinnedRank would freeze order; strip pins so Sort by applies to the whole grid. */
function stripPinRanksForSort(movies) {
  return movies.map((m) => {
    if (m.pinnedRank == null) return m;
    const rest = { ...m };
    delete rest.pinnedRank;
    return rest;
  });
}

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { watchRegion, watchRegionMeta, setWatchRegion, isAdmin } = useProfile();
  const [listEpoch, setListEpoch] = useState(0);
  const [curateMode, setCurateMode] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [curateNotice, setCurateNotice] = useState("");
  /** Featured order ids saved in this session (until tab/region/sort changes). */
  const [featuredOrder, setFeaturedOrder] = useState(null);
  const activeTab = TABS.find((t) => t.id === searchParams.get("tab")) ?? TABS[0];
  const sortKey = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "popular";

  const scope =
    activeTab.scope === "regional" || activeTab.genreId != null ? "regional" : "global";
  const canCurate = canCurateDiscoverTab(activeTab, { isAdmin });
  const { data, isLoading, error } = useMovieList(activeTab.genreId, scope, listEpoch);
  const compare = SORTS[sortKey].compare;
  const orderKey = JSON.stringify([activeTab.id, watchRegion, sortKey]);
  const featuredOrderIds = featuredOrder?.key === orderKey ? featuredOrder.ids : null;
  const setFeaturedOrderIds = (ids) => setFeaturedOrder(ids ? { key: orderKey, ids } : null);
  const movies = useMemo(() => {
    if (!data?.length) return [];
    if (featuredOrderIds?.length) {
      return mergeFeaturedOrder(data, featuredOrderIds, compare);
    }
    return [...stripPinRanksForSort(data)].sort(compare);
  }, [data, compare, featuredOrderIds]);
  const reloadList = () => setListEpoch((n) => n + 1);

  const heroImage = movies[0]?.backdropUrl ?? movies[0]?.posterUrl;

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => next.set(key, value));
    setSearchParams(next, { replace: true });
  };

  const handleWatchRegion = (code) => {
    const prev = watchRegion;
    setWatchRegion(code);
    if (code !== prev && activeTab.id === "trending") {
      updateParams({ tab: "local" });
    }
  };

  const handleTab = (tabId) => {
    setCurateMode(false);
    updateParams({ tab: tabId });
  };

  const resetDefaultOrder = async () => {
    const ok = window.confirm(
      "Clear your custom featured order for this tab and country? The list goes back to TMDB + your sort setting. Hidden titles stay hidden.",
    );
    if (!ok) return;
    const slot = discoverCurateSlot(activeTab, watchRegion);
    setResetBusy(true);
    setCurateNotice("");
    try {
      await resetDiscoverPins({
        region: slot.region,
        listKind: slot.listKind,
        genreId: slot.listKind === "genre" ? slot.genreId : null,
      });
      setCurateNotice("Featured order reset to default.");
      setFeaturedOrderIds(null);
      reloadList();
    } catch (err) {
      setCurateNotice(err.message || "Could not reset order.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="discover">
      <section className="discover__hero">
        <AnimatePresence>
          {heroImage && (
            <motion.div
              key={heroImage}
              className="discover__hero-image"
              style={{ backgroundImage: `url(${heroImage})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.33, 1, 0.45, 1] }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        <div className="discover__hero-shade" aria-hidden="true" />
        <div className="container discover__hero-content">
          <span className="eyebrow">Browse popular picks</span>
          <AnimatePresence mode="wait">
            <motion.h1
              key={activeTab.id}
              className="discover__title"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <activeTab.Icon size={36} className="discover__title-icon" />
              {activeTab.label}
            </motion.h1>
          </AnimatePresence>
          <p className="text-muted">
            {isLoading
              ? "Loading picks…"
              : activeTab.genreId || activeTab.scope === "regional"
                ? `${movies.length} picks for ${watchRegionMeta.label} ${watchRegionMeta.flag}`
                : `${movies.length} worldwide picks · change country to browse ${watchRegionMeta.flag} titles in other tabs`}
          </p>
        </div>
      </section>

      <div className="discover__toolbar">
        <div className="container">
          <div className="discover__tabs-track">
            <div className="discover__tabs" role="tablist" aria-label="Categories">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`discover__tab${isActive ? " is-active" : ""}`}
                    onClick={() => handleTab(tab.id)}
                  >
                    <tab.Icon size={15} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="container discover__body">
        <div className="discover__controls">
          <p className="discover__region-note text-muted">
            Country setting: <strong>{watchRegionMeta.label}</strong> {watchRegionMeta.flag} — affects{" "}
            <button type="button" className="discover__region-link" onClick={() => updateParams({ tab: "local" })}>
              Your country
            </button>{" "}
            and genre tabs (not Global).
          </p>
          <div className="discover__controls-bar" role="group" aria-label="Refine results">
            <DropdownSelect
              id="discover-region"
              label="Country"
              compact
              value={watchRegion}
              onChange={handleWatchRegion}
              options={REGION_OPTIONS}
            />
            <span className="discover__controls-divider" aria-hidden="true" />
            <DropdownSelect
              id="discover-sort"
              label="Sort by"
              compact
              value={sortKey}
              onChange={(key) => updateParams({ sort: key })}
              options={SORT_OPTIONS}
              menuAlign="end"
            />
          </div>
        </div>
        {canCurate && (
          <DiscoverCurateBar
            enabled={curateMode}
            onToggle={setCurateMode}
            busy={isLoading}
            resetBusy={resetBusy}
            onResetDefault={resetDefaultOrder}
            hint={
              isGlobalDiscoverTab(activeTab)
                ? "Global tab: drag to set the worldwide featured row (top 20). Country setting does not apply."
                : "Drag posters to reorder the featured row (top 20). Hide with the eye control; restore hidden titles in the panel below the list."
            }
          />
        )}
        {curateNotice && canCurate && <p className="discover-curate-grid__feedback">{curateNotice}</p>}
        {error ? (
          <EmptyState
            icon={SearchX}
            tone="error"
            title="Couldn't load movies"
            description="Check your connection and try another category."
          />
        ) : !isLoading && !movies.length ? (
          <EmptyState icon={SearchX} title="Nothing here yet" description="Try a different category." />
        ) : curateMode && canCurate ? (
          <DiscoverCurateGrid
            key={`${activeTab.id}-${watchRegion}-curate`}
            movies={movies}
            activeTab={activeTab}
            watchRegion={watchRegion}
            isLoading={isLoading && !movies.length}
            onFeaturedOrderSaved={setFeaturedOrderIds}
            onReload={reloadList}
          />
        ) : (
          <MovieGrid
            key={`${activeTab.id}-${watchRegion}-${sortKey}`}
            movies={movies}
            isLoading={isLoading}
            skeletonCount={18}
          />
        )}

        <div className="discover__cta">
          <div>
            <h2 className="discover__cta-title">Can't decide? Let us choose for you.</h2>
            <p className="text-muted">Answer 4 quick questions and get a personalized match in under 60 seconds.</p>
          </div>
          <Link to="/find" className="btn btn--primary btn--lg">
            <WandSparkles size={18} /> Find my perfect movie
          </Link>
        </div>
      </div>
    </div>
  );
}
