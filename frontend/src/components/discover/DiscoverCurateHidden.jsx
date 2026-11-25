import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { deleteDiscoverExclusion, listDiscoverExclusions } from "../../services/adminApi";
import { discoverCurateSlot } from "../../utils/discoverCurateSlot";

export default function DiscoverCurateHidden({ activeTab, watchRegion, onRestored }) {
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const { region, listKind, genreId } = discoverCurateSlot(activeTab, watchRegion);

  const load = useCallback(async () => {
    const data = await listDiscoverExclusions({
      region,
      listKind,
      genreId: listKind === "genre" ? genreId : undefined,
    });
    setRows(data.exclusions ?? []);
  }, [region, listKind, genreId]);

  useEffect(() => {
    let cancelled = false;
    listDiscoverExclusions({ region, listKind, genreId: genreId ?? undefined })
      .then((data) => { if (!cancelled) setRows(data.exclusions ?? []); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [region, listKind, genreId]);

  const restore = async (id) => {
    setBusyId(id);
    try {
      await deleteDiscoverExclusion(id);
      await load();
      onRestored?.();
    } finally {
      setBusyId(null);
    }
  };

  if (!rows.length) return null;

  return (
    <details className="discover-curate-hidden" open>
      <summary className="discover-curate-hidden__summary">
        Hidden from this list ({rows.length}) — add back to Discover
      </summary>
      <ul className="discover-curate-hidden__list">
        {rows.map((row) => {
          const label =
            row.title != null ? `${row.title}${row.year ? ` (${row.year})` : ""}` : `TMDB ${row.tmdbId}`;
          return (
            <li key={row.id} className="discover-curate-hidden__item">
              <span>{label}</span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={busyId === row.id}
                onClick={() => restore(row.id)}
              >
                <Plus size={14} /> Add to Discover
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
