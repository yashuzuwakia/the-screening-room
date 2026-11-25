import {
  Apple,
  Clapperboard,
  Globe,
  MonitorPlay,
  Package,
  Sparkles,
  Ticket,
  Tv,
} from "lucide-react";
import { DEFAULT_WATCH_REGION } from "./regions.js";

/** Default when no profile region is set (see ProfileProvider). */
export const WATCH_REGION = DEFAULT_WATCH_REGION;

// `providerIds` are TMDB watch-provider IDs; a platform with none is handled specially by the engine.
export const PLATFORMS = [
  { id: "netflix", name: "Netflix", color: "#E50914", Icon: Tv, providerIds: [8] },
  { id: "prime", name: "Prime Video", color: "#00A8E1", Icon: Package, providerIds: [9, 119] },
  { id: "disney", name: "Disney+", color: "#113CCF", Icon: Sparkles, providerIds: [337] },
  { id: "max", name: "Max", color: "#5B4EE8", Icon: MonitorPlay, providerIds: [1899, 384] },
  { id: "hulu", name: "Hulu", color: "#1CE783", Icon: Clapperboard, providerIds: [15] },
  { id: "apple", name: "Apple TV+", color: "#6E6E73", Icon: Apple, providerIds: [350] },
  { id: "theaters", name: "In Theaters", color: "#F5C518", Icon: Ticket, providerIds: [] },
  { id: "any", name: "Any Platform", color: "#71717A", Icon: Globe, providerIds: [] },
];

export const getPlatform = (id) => PLATFORMS.find((p) => p.id === id);

export const getPlatformByName = (name) => PLATFORMS.find((p) => p.name === name);
