export function formatRuntime(minutes) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

const listFormatter = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
export const formatList = (items) => listFormatter.format(items);

const compactFormatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const formatCompact = (value) => compactFormatter.format(value);

export const formatRating = (rating) => (rating ? rating.toFixed(1) : "—");

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}
