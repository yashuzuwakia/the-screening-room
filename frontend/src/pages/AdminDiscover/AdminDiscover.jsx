import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { EyeOff, RotateCcw, Search } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import { REGIONS } from "../../constants/regions";
import { GENRES } from "../../constants/genres";
import {
  adminSearchMovies,
  createDiscoverExclusion,
  deleteDiscoverExclusion,
  listDiscoverExclusions,
} from "../../services/adminApi";
import { isApiMode } from "../../services/apiClient";
import Poster from "../../components/movie/Poster";
import { GLOBAL_DISCOVER_REGION } from "../../utils/discoverCurateSlot";
import "./AdminDiscover.css";

const DEFAULT = { region: "IN", listKind: "regional", genreId: "" };

export default function AdminDiscover() {
  const { isAdmin, isSignedIn } = useProfile();
  const [exclusions, setExclusions] = useState([]);
  const [form, setForm] = useState(DEFAULT);
  const [selectedTmdbId, setSelectedTmdbId] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const slotQuery = useCallback(() => {
    if (form.listKind === "global") {
      return { region: GLOBAL_DISCOVER_REGION, listKind: "global" };
    }
    return {
      region: form.region,
      listKind: form.listKind,
      genreId: form.listKind === "genre" ? form.genreId : undefined,
    };
  }, [form.region, form.listKind, form.genreId]);

  const slotBody = () => ({
    region: form.listKind === "global" ? GLOBAL_DISCOVER_REGION : form.region,
    listKind: form.listKind,
    genreId: form.listKind === "genre" ? Number(form.genreId) : null,
  });

  const loadExclusions = useCallback(async () => {
    const data = await listDiscoverExclusions(slotQuery());
    setExclusions(data.exclusions ?? []);
  }, [slotQuery]);

  useEffect(() => {
    if (!isAdmin || !isApiMode()) return;
    let cancelled = false;
    listDiscoverExclusions(slotQuery()).then((data) => {
      if (!cancelled) setExclusions(data.exclusions ?? []);
    }).catch((err) => {
      if (cancelled) return;
      setExclusions([]);
      setError(err.message || "Could not load hidden titles.");
    });
    return () => { cancelled = true; };
  }, [isAdmin, slotQuery]);

  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/profile" replace />;
  if (!isApiMode()) {
    return (
      <div className="container page">
        <p className="text-muted">Admin tools require API mode (VITE_USE_API=true) and a running backend.</p>
      </div>
    );
  }

  const runSearch = async (event) => {
    event?.preventDefault();
    setSearching(true);
    setError("");
    try {
      const data = await adminSearchMovies(searchQ.trim(), searchYear.trim() || undefined);
      setSearchResults(data.movies ?? []);
      if (!data.movies?.length) setMessage("No TMDB matches for that search.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const hideSelected = async () => {
    if (!selectedTmdbId) {
      setError("Pick a movie from search results first.");
      return;
    }
    if (form.listKind === "genre" && !form.genreId) {
      setError("Choose a genre for this list.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createDiscoverExclusion({
        ...slotBody(),
        tmdbId: selectedTmdbId,
      });
      setMessage("Hidden from this Discover list. Restore it on Discover (edit mode) or below.");
      await loadExclusions();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const restoreExclusion = async (id) => {
    setBusy(true);
    setError("");
    try {
      await deleteDiscoverExclusion(id);
      setMessage("Title can appear again from TMDB on this list.");
      await loadExclusions();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page admin-discover">
      <header className="admin-discover__head">
        <span className="eyebrow">Discover curation</span>
        <h1 className="admin-discover__title">Search &amp; hide titles</h1>
        <p className="text-muted">
          Find a movie on TMDB and remove it from a Discover list. To reorder posters, use{" "}
          <Link to="/discover">Discover</Link> → Edit list.
        </p>
      </header>

      <section className="admin-discover__panel">
        <h2 className="admin-discover__section-title">Find on TMDB</h2>
        <form className="admin-discover__search" onSubmit={runSearch}>
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Movie title"
            className="admin-discover__input"
          />
          <input
            type="text"
            inputMode="numeric"
            value={searchYear}
            onChange={(e) => setSearchYear(e.target.value)}
            placeholder="Year"
            className="admin-discover__input admin-discover__input--year"
          />
          <button type="submit" className="btn btn--secondary" disabled={searching}>
            <Search size={16} /> {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {searchResults.length > 0 && (
          <ul className="admin-discover__results">
            {searchResults.map((movie) => {
              const picked = selectedTmdbId === movie.id;
              return (
                <li key={movie.id}>
                  <button
                    type="button"
                    className={`admin-discover__pick${picked ? " is-selected" : ""}`}
                    onClick={() => setSelectedTmdbId(movie.id)}
                  >
                    <Poster src={movie.posterUrl} title={movie.title} className="admin-discover__thumb" />
                    <span>
                      <strong>{movie.title}</strong>
                      <span className="text-muted">
                        {" "}
                        · {movie.year} · TMDB {movie.id}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-discover__panel">
        <h2 className="admin-discover__section-title">Apply to list</h2>
        <div className="admin-discover__grid">
          {form.listKind !== "global" && (
            <label>
              Country
              <select value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.flag} {r.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            List
            <select
              value={form.listKind}
              onChange={(e) => setForm((f) => ({ ...f, listKind: e.target.value, genreId: "" }))}
            >
              <option value="global">Global trending</option>
              <option value="regional">Your country / regional trending</option>
              <option value="genre">Genre tab</option>
            </select>
          </label>
          {form.listKind === "genre" && (
            <label>
              Genre
              <select value={form.genreId} onChange={(e) => setForm((f) => ({ ...f, genreId: e.target.value }))}>
                <option value="">Choose genre…</option>
                {GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button type="button" className="btn btn--secondary" onClick={hideSelected} disabled={busy}>
          <EyeOff size={16} /> Hide from list
        </button>
      </section>

      {error && <p className="admin-discover__error">{error}</p>}
      {message && <p className="admin-discover__ok">{message}</p>}

      <section className="admin-discover__panel">
        <h2 className="admin-discover__section-title">
          Hidden ({form.listKind === "global" ? "Global" : form.region})
        </h2>
        {exclusions.length === 0 ? (
          <p className="text-muted">Nothing hidden for this filter.</p>
        ) : (
          <ul className="admin-discover__pins">
            {exclusions.map((row) => {
              const label =
                row.title != null
                  ? `${row.title}${row.year ? ` (${row.year})` : ""}`
                  : `TMDB ${row.tmdbId}`;
              return (
                <li key={row.id} className="admin-discover__pin-row">
                  <span className="admin-discover__pin-label">{label}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => restoreExclusion(row.id)}
                    disabled={busy}
                  >
                    <RotateCcw size={14} /> Add back to Discover
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
