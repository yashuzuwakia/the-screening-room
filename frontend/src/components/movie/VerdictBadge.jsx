import { communityVerdictForMovie } from "../../constants/verdicts.js";
import VerdictIcon from "../common/VerdictIcon.jsx";
import "./VerdictBadge.css";

export default function VerdictBadge({ movie, variant = "inline", title }) {
  const verdict = communityVerdictForMovie(movie);
  if (!verdict) return null;

  const text = title ?? verdict.short;

  return (
    <span
      className={`verdict-badge verdict-badge--${variant} verdict-badge--${verdict.tone}`}
      title={`${movie.communityCount} watcher vote${movie.communityCount === 1 ? "" : "s"}`}
    >
      <VerdictIcon verdict={verdict} size={variant === "poster" ? 12 : 14} className="verdict-badge__icon" />
      <span className="verdict-badge__text">{text}</span>
    </span>
  );
}
