import { Sparkles, SlidersHorizontal, Clapperboard } from "lucide-react";

export const HOW_IT_WORKS = [
  {
    Icon: Sparkles,
    title: "Tell us your mood",
    description: "Thrills, laughs, tears or something mind-bending. Start with how you feel.",
  },
  {
    Icon: SlidersHorizontal,
    title: "Set your preferences",
    description: "Pick genres, the services you subscribe to and how much time you have.",
  },
  {
    Icon: Clapperboard,
    title: "Get your perfect movie",
    description: "We score dozens of candidates and explain exactly why the winner fits.",
  },
];

const unsplash = (id) => `https://images.unsplash.com/${id}?w=800&fit=crop&q=70`;

export const HERO_COLLAGE = [
  unsplash("photo-1489599849927-2ee91cede3ba"),
  unsplash("photo-1595769816263-9b910be24d5f"),
  unsplash("photo-1536440136628-849c177e76a1"),
  unsplash("photo-1517604931442-7e0c8ed2963c"),
];
