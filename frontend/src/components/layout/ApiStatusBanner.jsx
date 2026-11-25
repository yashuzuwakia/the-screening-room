import { AlertCircle, Info, RefreshCw } from "lucide-react";
import { useApiHealth } from "../../hooks/useApiHealth";
import { isTmdbConfigured } from "../../services/tmdbClient";
import "./ApiStatusBanner.css";

export default function ApiStatusBanner() {
  const { enabled, checked, ok, retry } = useApiHealth();
  const tmdbOk = isTmdbConfigured;

  if (!enabled || !checked || ok) return null;

  if (tmdbOk) {
    return (
      <div className="api-status api-status--info" role="status">
        <Info size={18} aria-hidden="true" />
        <p>
          Backend is offline — you&apos;re still seeing <strong>live TMDB</strong> movies. Accounts, synced watchlist,
          and your movie ratings need the API (<code>npm run dev</code> after Docker + Postgres).
        </p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={retry}>
          <RefreshCw size={14} /> Retry API
        </button>
      </div>
    );
  }

  return (
    <div className="api-status" role="status">
      <AlertCircle size={18} aria-hidden="true" />
      <p>
        Backend not reachable and no <code>VITE_TMDB_API_KEY</code> — using the built-in demo catalog only. Start the
        API or add a TMDB key in <code>.env.local</code>.
      </p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={retry}>
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}
