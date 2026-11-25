import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Trash2 } from "lucide-react";
import {
  clearResultsSession,
  describeResultsSession,
  loadResultsSession,
  resultsSessionPath,
  RESULTS_SESSION_STORAGE_KEY,
} from "../../utils/resultsSession";
import "./ContinueFindBanner.css";

export default function LastResultsBanner() {
  const [session, setSession] = useState(() => loadResultsSession());

  const refresh = useCallback(() => setSession(loadResultsSession()), []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === RESULTS_SESSION_STORAGE_KEY) refresh();
    };
    const onSession = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("moviematch:results-session", onSession);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("moviematch:results-session", onSession);
    };
  }, [refresh]);

  if (!session) return null;

  const discard = () => {
    clearResultsSession();
    refresh();
  };

  return (
    <aside className="continue-find continue-find--results" aria-label="Last movie results">
      <div className="container continue-find__inner">
        {session.topPick?.posterUrl ? (
          <img className="continue-find__thumb" src={session.topPick.posterUrl} alt="" />
        ) : (
          <span className="continue-find__icon" aria-hidden>
            <Sparkles size={20} />
          </span>
        )}
        <div className="continue-find__body">
          <p className="continue-find__title">Your last match</p>
          <p className="continue-find__detail">{describeResultsSession(session)}</p>
        </div>
        <div className="continue-find__actions">
          <Link to={resultsSessionPath(session, { resume: true })} className="btn btn--primary btn--sm">
            View results <ArrowRight size={15} />
          </Link>
          <button type="button" className="btn btn--ghost btn--sm" onClick={discard}>
            <Trash2 size={14} /> Discard
          </button>
        </div>
      </div>
    </aside>
  );
}
