import {
  Dices,
  Flame,
  Ghost,
  Laugh,
  Moon,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

// `genreIds` are TMDB genres used for the mood score in the recommendation engine.
export const MOODS = [
  {
    id: "mind-blowing",
    label: "Mind-Blowing",
    Icon: Sparkles,
    adjective: "mind-bending",
    genreIds: [878, 9648, 53],
  },
  { id: "funny", label: "Funny", Icon: Laugh, adjective: "light and funny", genreIds: [35] },
  { id: "emotional", label: "Emotional", Icon: Star, adjective: "moving", genreIds: [18, 10749] },
  { id: "thrilling", label: "Thrilling", Icon: Zap, adjective: "edge-of-your-seat", genreIds: [53, 80, 28] },
  { id: "relaxing", label: "Relaxing", Icon: Moon, adjective: "easygoing", genreIds: [35, 10751, 16, 10402] },
  { id: "scary", label: "Scary", Icon: Ghost, adjective: "genuinely scary", genreIds: [27, 53] },
  {
    id: "action-packed",
    label: "Action-Packed",
    Icon: Flame,
    adjective: "high-octane",
    genreIds: [28, 12],
  },
  { id: "surprise", label: "Surprise Me", Icon: Dices, adjective: "unexpected", genreIds: [] },
];

export const getMood = (id) => MOODS.find((mood) => mood.id === id);
