/** ISO 3166-1 codes supported for TMDB popular lists & watch providers. */
export const REGIONS = [
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "IN", label: "India", flag: "🇮🇳" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "DE", label: "Germany", flag: "🇩🇪" },
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "JP", label: "Japan", flag: "🇯🇵" },
  { code: "KR", label: "South Korea", flag: "🇰🇷" },
  { code: "BR", label: "Brazil", flag: "🇧🇷" },
  { code: "MX", label: "Mexico", flag: "🇲🇽" },
  { code: "ES", label: "Spain", flag: "🇪🇸" },
  { code: "IT", label: "Italy", flag: "🇮🇹" },
  { code: "AE", label: "UAE", flag: "🇦🇪" },
  { code: "SG", label: "Singapore", flag: "🇸🇬" },
];

export const DEFAULT_WATCH_REGION =
  import.meta.env.VITE_WATCH_REGION?.trim().toUpperCase() || inferRegionFromLocale() || "US";

export function getRegion(code) {
  const upper = code?.toUpperCase();
  return REGIONS.find((r) => r.code === upper) ?? { code: upper || "US", label: upper || "your region", flag: "🌍" };
}

function inferRegionFromLocale() {
  try {
    const part = navigator.language?.split("-")[1];
    return part?.length === 2 ? part.toUpperCase() : null;
  } catch {
    return null;
  }
}

export function isValidRegion(code) {
  return REGIONS.some((r) => r.code === code?.toUpperCase());
}
