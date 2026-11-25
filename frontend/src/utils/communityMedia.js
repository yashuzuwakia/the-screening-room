export const COMMUNITY_MEDIA_MAX = 4;

export function canSubmitComment({ text, mediaUrls }) {
  const trimmed = text?.trim() ?? "";
  const media = (mediaUrls ?? []).filter(Boolean);
  return Boolean(trimmed || media.length);
}
