import { Link } from "react-router-dom";
import { GripVertical, RotateCcw, Search } from "lucide-react";
import "./DiscoverCurate.css";

export default function DiscoverCurateBar({
  enabled,
  onToggle,
  busy,
  hint,
  onResetDefault,
  resetBusy,
}) {
  return (
    <div className="discover-curate-bar">
      <div className="discover-curate-bar__main">
        <label className="discover-curate-bar__toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} disabled={busy} />
          <GripVertical size={16} aria-hidden />
          Edit list (admin)
        </label>
        <div className="discover-curate-bar__actions">
          {enabled && onResetDefault && (
            <button
              type="button"
              className="btn btn--ghost btn--sm discover-curate-bar__reset"
              disabled={busy || resetBusy}
              onClick={onResetDefault}
            >
              <RotateCcw size={14} /> Reset to default order
            </button>
          )}
          <Link to="/admin/discover" className="discover-curate-bar__link">
            <Search size={14} /> Search & hide by title
          </Link>
        </div>
      </div>
      {enabled && hint && <p className="discover-curate-bar__hint text-muted">{hint}</p>}
      {(busy || resetBusy) && <p className="discover-curate-bar__hint text-muted">Saving…</p>}
    </div>
  );
}
