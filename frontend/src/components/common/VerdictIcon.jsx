import { getVerdict } from "../../constants/verdicts";

export default function VerdictIcon({ verdictId, verdict, size = 18, className = "", strokeWidth = 2 }) {
  const v = verdict ?? (typeof verdictId === "string" ? getVerdict(verdictId) : verdictId);
  if (!v?.Icon) return null;
  const Icon = v.Icon;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
