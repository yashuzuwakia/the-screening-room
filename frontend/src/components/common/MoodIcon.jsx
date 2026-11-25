import { getMood } from "../../constants/moods";

export default function MoodIcon({ moodId, size = 22, className = "", strokeWidth = 2 }) {
  const mood = typeof moodId === "string" ? getMood(moodId) : moodId;
  if (!mood?.Icon) return null;
  const Icon = mood.Icon;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
