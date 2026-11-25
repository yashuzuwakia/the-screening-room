import { Frown, Heart, Skull, ThumbsUp } from "lucide-react";

/**
 * Simple movie verdicts — stored as numeric scores on the server (for averages).
 * `review` field holds `verdict:<id>` so we can round-trip the user's pick.
 */
export const VERDICTS = [
  {
    id: "love",
    label: "Love it",
    short: "Love",
    score: 9,
    Icon: Heart,
    hint: "Would watch again",
    tone: "love",
  },
  {
    id: "good",
    label: "The Good",
    short: "Good",
    score: 7.5,
    Icon: ThumbsUp,
    hint: "Worth your time",
    tone: "good",
  },
  {
    id: "bad",
    label: "The Bad",
    short: "Bad",
    score: 4.5,
    Icon: Frown,
    hint: "Mostly a miss",
    tone: "bad",
  },
  {
    id: "ugly",
    label: "The Ugly",
    short: "Ugly",
    score: 2,
    Icon: Skull,
    hint: "Skip it",
    tone: "ugly",
  },
];

const PREFIX = "verdict:";

export function getVerdict(id) {
  return VERDICTS.find((v) => v.id === id) ?? null;
}

export function encodeVerdictReview(verdictId) {
  return `${PREFIX}${verdictId}`;
}

export function verdictFromReview(review) {
  if (typeof review === "string" && review.startsWith(PREFIX)) {
    return getVerdict(review.slice(PREFIX.length));
  }
  return null;
}

/** Map a stored score (and optional review) to the verdict the user likely meant. */
export function verdictFromRating(rating) {
  if (rating == null || typeof rating !== "object") return null;
  const { score, review } = rating;
  const fromReview = verdictFromReview(review);
  if (fromReview) return fromReview;
  if (score == null) return null;
  return VERDICTS.reduce((best, v) =>
    Math.abs(v.score - score) < Math.abs(best.score - score) ? v : best,
  );
}

export function communityVerdictLabel(avgScore) {
  if (avgScore == null || Number.isNaN(avgScore)) return null;
  const v = verdictFromRating({ score: avgScore });
  return v ? v.short : null;
}

/** Crowd verdict for a movie row from the API (community_avg / community_count). */
export function communityVerdictForMovie(movie) {
  if (!movie?.communityCount || movie.communityCount < 1) return null;
  return verdictFromRating({ score: movie.communityRating });
}
