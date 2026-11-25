import assert from "node:assert/strict";
import test from "node:test";
import { rankMovies, scoreMovie } from "../src/services/recommendationEngine.js";

const films = [
  { id: 1, title: "Action feature", genreIds: [28], runtime: 125, popularity: 750, rating: 7.6, voteCount: 4000 },
  { id: 2, title: "Short comedy", genreIds: [35], runtime: 82, popularity: 320, rating: 7.4, voteCount: 4000 },
  { id: 3, title: "Family animation", genreIds: [35, 16], runtime: 85, popularity: 200, rating: 7.5, voteCount: 4000 },
  { id: 4, title: "Animated musical", genreIds: [16, 10402], runtime: 95, popularity: 140, rating: 7.6, voteCount: 4000 },
  { id: 5, title: "Mystery", genreIds: [9648], runtime: 115, popularity: 650, rating: 7.4, voteCount: 4000 },
  { id: 6, title: "Thriller", genreIds: [53], runtime: 110, popularity: 580, rating: 7.5, voteCount: 4000 },
];

const prefs = { mood: "funny", genres: [35], platforms: ["netflix"], runtime: "short", watchRegion: "US" };

test("scores runtime, missing metadata, and per-title platform fallback", () => {
  const confirmed = scoreMovie(films[1], prefs, { platformFiltered: true });
  const relaxed = scoreMovie({ ...films[1], platformFilterRelaxed: true }, prefs, { platformFiltered: true });
  assert.equal(confirmed.breakdown.platform, 100);
  assert.ok(relaxed.score < confirmed.score);
  assert.ok(scoreMovie(films[0], prefs).breakdown.runtime < confirmed.breakdown.runtime);
  const unrated = scoreMovie({ genreIds: [35] }, prefs);
  assert.equal(unrated.breakdown.runtime, 70);
  assert.ok(Number.isFinite(unrated.score));
});

test("weighted ranking finds more relevant top-three picks than popularity on fixed examples", () => {
  const baseline = [...films].sort((a, b) => b.popularity - a.popularity).slice(0, 3);
  const scenarios = [
    { preferences: prefs, relevant: [2, 3] },
    { preferences: { ...prefs, mood: "relaxing", genres: [16], runtime: "medium" }, relevant: [3, 4] },
    { preferences: { ...prefs, mood: "mind-blowing", genres: [9648], runtime: "medium" }, relevant: [5, 6] },
  ];
  const count = (movies, relevant) => movies.filter((movie) => relevant.includes(movie.id)).length;
  let rankedHits = 0;
  let baselineHits = 0;
  for (const { preferences, relevant } of scenarios) {
    const ranked = rankMovies(films, preferences).slice(0, 3);
    assert.ok(relevant.includes(ranked[0].id));
    rankedHits += count(ranked, relevant);
    baselineHits += count(baseline, relevant);
  }
  assert.ok(rankedHits > baselineHits, `Weighted ${rankedHits}; popularity ${baselineHits}`);
});

test("recommendations apply regional provider and runtime filters, relax providers, and exclude seen movies", async (t) => {
  process.env.TMDB_API_KEY = "fixture-key";
  process.env.JWT_SECRET = "fixture-secret";
  process.env.DATABASE_URL = "postgresql://fixture:fixture@localhost/fixture";
  const rows = films.filter((film) => film.runtime <= 90).map((film) => ({
    tmdbId: film.id, title: film.title, runtime: film.runtime, genreIds: film.genreIds,
    voteAverage: film.rating, voteCount: film.voteCount, popularity: film.popularity,
    syncedAt: new Date(),
  }));
  globalThis.prisma = {
    movie: {
      findMany: async ({ where }) => rows.filter((row) => where.tmdbId.in.includes(row.tmdbId)),
    },
  };
  t.after(() => { delete globalThis.prisma; });
  const { getRecommendations } = await import("../src/services/recommendationService.js");
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(url);
    const results = url.searchParams.has("with_watch_providers") ? [] : rows.map((row) => ({
      id: row.tmdbId, title: row.title, poster_path: "/fixture.jpg", genre_ids: row.genreIds,
    }));
    return Response.json({ results });
  });

  const { results } = await getRecommendations({ ...prefs, excludeIds: [2] });
  assert.deepEqual(results.map((movie) => movie.id), [3]);
  assert.equal(results[0].platformFilterRelaxed, true);
  assert.equal(results[0].breakdown.platform, 70);
  assert.ok(requests.some((url) => url.searchParams.get("watch_region") === "US"
    && url.searchParams.get("with_watch_providers") === "8"));
  assert.ok(requests.every((url) => url.searchParams.get("with_runtime.lte") === "90"));
});
