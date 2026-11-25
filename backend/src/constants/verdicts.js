const VERDICTS = [
  { id: "love", short: "Love it", score: 9 },
  { id: "good", short: "The Good", score: 7.5 },
  { id: "bad", short: "The Bad", score: 4.5 },
  { id: "ugly", short: "The Ugly", score: 2 },
];

export function communityVerdictFromScore(avgScore) {
  if (avgScore == null) return "unrated";
  const nearest = VERDICTS.reduce((best, v) =>
    Math.abs(v.score - avgScore) < Math.abs(best.score - avgScore) ? v : best,
  );
  return nearest.short;
}
