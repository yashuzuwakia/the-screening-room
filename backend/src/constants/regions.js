/** ISO 3166-1 codes aligned with frontend `REGIONS`. */
export const REGION_CODES = [
  "US",
  "IN",
  "GB",
  "CA",
  "AU",
  "DE",
  "FR",
  "JP",
  "KR",
  "BR",
  "MX",
  "ES",
  "IT",
  "AE",
  "SG",
];

export function normalizeWatchRegion(code, fallback = "US") {
  const upper = code?.toUpperCase();
  if (upper && REGION_CODES.includes(upper)) return upper;
  const fb = fallback?.toUpperCase();
  return REGION_CODES.includes(fb) ? fb : "US";
}
