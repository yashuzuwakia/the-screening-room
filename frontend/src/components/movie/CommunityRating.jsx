import { useState } from "react";
import { useProfile } from "../../hooks/useProfile";
import { deleteMovieRating, submitMovieVerdict } from "../../services/movieService";
import { isApiMode } from "../../services/apiClient.js";
import { Link } from "react-router-dom";
import {
  VERDICTS,
  communityVerdictLabel,
  verdictFromRating,
} from "../../constants/verdicts.js";
import VerdictIcon from "../common/VerdictIcon.jsx";
import "./CommunityRating.css";

export default function CommunityRating({
  movieId,
  communityRating,
  communityCount,
  initialUserRating,
  onCommunityChange,
}) {
  const { isSignedIn } = useProfile();
  const initialVerdict = verdictFromRating(initialUserRating)?.id ?? null;
  const [userVerdictId, setUserVerdictId] = useState(initialVerdict);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!isApiMode()) return null;

  const applyCrowd = (rating, count) => {
    onCommunityChange?.({ communityRating: rating, communityCount: count ?? 0 });
  };

  const crowdLabel = communityVerdictLabel(communityRating);
  const crowdVerdict = verdictFromRating({ score: communityRating });

  const handlePick = async (verdictId) => {
    if (!isSignedIn || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await submitMovieVerdict(movieId, verdictId);
      const picked = verdictFromRating(result.userRating)?.id ?? verdictId;
      setUserVerdictId(picked);
      if (result.movie) {
        applyCrowd(result.movie.communityRating, result.movie.communityCount);
      }
      setMessage("Saved — thanks for weighing in.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      const result = await deleteMovieRating(movieId);
      setUserVerdictId(null);
      if (result?.movie) {
        applyCrowd(result.movie.communityRating, result.movie.communityCount);
      }
      setMessage("Verdict removed.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="community-rating">
      <p className="details__label">Watcher verdicts</p>
      <p className="community-rating__crowd">
        {crowdLabel && crowdVerdict ? (
          <>
            Most say: <strong>{crowdVerdict.label}</strong>{" "}
            <VerdictIcon verdict={crowdVerdict} size={18} className="community-rating__crowd-icon" />
            <span className="text-muted"> · {communityCount ?? 0} verdicts</span>
          </>
        ) : (
          <span className="text-muted">No verdicts yet — pick one below.</span>
        )}
      </p>
      <p className="community-rating__legend text-muted">
        Skip the 1–10 slider. Was it <strong>Good</strong>, <strong>Bad</strong>, or <strong>Ugly</strong>?
      </p>

      {isSignedIn ? (
        <div className="verdict-picker" role="group" aria-label="Your verdict">
          {VERDICTS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`verdict-picker__btn verdict-picker__btn--${v.tone}${
                userVerdictId === v.id ? " is-selected" : ""
              }`}
              onClick={() => handlePick(v.id)}
              disabled={busy}
              aria-pressed={userVerdictId === v.id}
            >
              <VerdictIcon verdict={v} size={22} className="verdict-picker__icon" />
              <span className="verdict-picker__label">{v.label}</span>
              <span className="verdict-picker__hint">{v.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted">
          <Link to="/login">Sign in</Link> to leave your verdict.
        </p>
      )}

      {isSignedIn && userVerdictId && (
        <button type="button" className="btn btn--ghost btn--sm community-rating__clear" onClick={handleClear} disabled={busy}>
          Clear my verdict
        </button>
      )}
      {message && <p className="community-rating__message">{message}</p>}
    </div>
  );
}
