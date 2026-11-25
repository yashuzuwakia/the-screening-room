import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EyeOff, Plus } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import { isApiMode } from "../../services/apiClient";
import {
  createDiscoverExclusion,
  deleteDiscoverExclusion,
  listDiscoverExclusions,
} from "../../services/adminApi";
import "./DiscoverCurate.css";

export default function MovieDiscoverAdmin({ movie }) {
  const { isAdmin, watchRegion, watchRegionMeta } = useProfile();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hiddenRowId, setHiddenRowId] = useState(null);

  useEffect(() => {
    if (!isAdmin || !isApiMode() || !movie) return;
    const tmdbId = movie.tmdbId ?? movie.id;
    const region = (watchRegion || "US").toUpperCase();
    listDiscoverExclusions({ region, listKind: "regional" })
      .then((data) => {
        const hit = (data.exclusions ?? []).find((row) => row.tmdbId === tmdbId);
        setHiddenRowId(hit?.id ?? null);
      })
      .catch(() => setHiddenRowId(null));
  }, [isAdmin, movie, watchRegion]);

  if (!isAdmin || !isApiMode() || !movie) return null;

  const tmdbId = movie.tmdbId ?? movie.id;
  const region = (watchRegion || "US").toUpperCase();

  const hide = async () => {
    setBusy(true);
    setMessage("");
    try {
      await createDiscoverExclusion({
        region,
        listKind: "regional",
        genreId: null,
        tmdbId,
      });
      setMessage("Hidden from your country list. Restore on Discover (edit mode) or below.");
      const data = await listDiscoverExclusions({ region, listKind: "regional" });
      const hit = (data.exclusions ?? []).find((row) => row.tmdbId === tmdbId);
      setHiddenRowId(hit?.id ?? null);
    } catch (err) {
      setMessage(err.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!hiddenRowId) return;
    setBusy(true);
    setMessage("");
    try {
      await deleteDiscoverExclusion(hiddenRowId);
      setHiddenRowId(null);
      setMessage("Added back to Discover for your country list.");
    } catch (err) {
      setMessage(err.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="discover-admin-actions">
      <p className="text-muted">
        Admin · reorder on <Link to="/discover?tab=local">Discover</Link> (edit mode). Country:{" "}
        {watchRegionMeta.flag} {watchRegionMeta.label}
      </p>
      {hiddenRowId ? (
        <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={restore}>
          <Plus size={14} /> Add back to Discover
        </button>
      ) : (
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={hide}>
          <EyeOff size={14} /> Hide from country list
        </button>
      )}
      {message && <p className="text-muted">{message}</p>}
    </div>
  );
}
