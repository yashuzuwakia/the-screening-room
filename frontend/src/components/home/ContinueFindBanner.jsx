import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trash2, WandSparkles } from "lucide-react";
import {
  clearFindDraft,
  describeFindDraft,
  FIND_DRAFT_STORAGE_KEY,
  loadFindDraft,
} from "../../utils/findDraft";
import "./ContinueFindBanner.css";

export default function ContinueFindBanner() {
  const [draft, setDraft] = useState(() => loadFindDraft());

  const refresh = useCallback(() => setDraft(loadFindDraft()), []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === FIND_DRAFT_STORAGE_KEY) refresh();
    };
    const onDraft = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("moviematch:find-draft", onDraft);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("moviematch:find-draft", onDraft);
    };
  }, [refresh]);

  if (!draft) return null;

  const discard = () => {
    clearFindDraft();
    refresh();
  };

  return (
    <aside className="continue-find" aria-label="Resume movie search">
      <div className="container continue-find__inner">
        <span className="continue-find__icon" aria-hidden>
          <WandSparkles size={20} />
        </span>
        <div className="continue-find__body">
          <p className="continue-find__title">Paused movie search</p>
          <p className="continue-find__detail">{describeFindDraft(draft)}</p>
        </div>
        <div className="continue-find__actions">
          <Link to="/find?resume=1" className="btn btn--primary btn--sm">
            Continue <ArrowRight size={15} />
          </Link>
          <button type="button" className="btn btn--ghost btn--sm" onClick={discard}>
            <Trash2 size={14} /> Discard
          </button>
        </div>
      </div>
    </aside>
  );
}
