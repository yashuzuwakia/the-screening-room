import { Router } from "express";
import { z } from "zod";
import { getMood } from "../constants/moods.js";
import { getRuntimeOption } from "../constants/runtimes.js";
import { getPlatform } from "../constants/platforms.js";
import { getRecommendations } from "../services/recommendationService.js";
import { explainMatch } from "../services/recommendationEngine.js";
import { optionalAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const prefsSchema = z.object({
  mood: z.string(),
  genres: z.array(z.coerce.number().int()).min(1),
  platforms: z.array(z.string()).min(1),
  runtime: z.string(),
});

function validatePrefs(body) {
  const prefs = prefsSchema.parse(body);
  if (!getMood(prefs.mood)) throw new Error("Invalid mood");
  if (!getRuntimeOption(prefs.runtime)) throw new Error("Invalid runtime");
  prefs.platforms.forEach((id) => {
    if (!getPlatform(id)) throw new Error(`Invalid platform: ${id}`);
  });
  return prefs;
}

router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const prefs = validatePrefs(req.body);
    const payload = await getRecommendations(prefs);

    const top = payload.results[0];
    const explanation = top ? explainMatch(top, prefs) : null;

    if (req.user) {
      await prisma.recommendationSession.create({
        data: {
          userId: req.user.id,
          mood: prefs.mood,
          genres: prefs.genres,
          platforms: prefs.platforms,
          runtime: prefs.runtime,
          results: payload.results,
          source: payload.source,
          elapsedMs: payload.elapsedMs,
        },
      });
    }

    res.json({ ...payload, explanation });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    if (error.message?.startsWith("Invalid")) return res.status(400).json({ error: error.message });
    next(error);
  }
});

export default router;
