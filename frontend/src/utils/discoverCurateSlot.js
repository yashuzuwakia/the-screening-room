import { isApiMode } from "../services/apiClient";

export const GLOBAL_DISCOVER_REGION = "GL";

/** Admin edit mode is available on every Discover tab when the API is on. */
export function canCurateDiscoverTab(_activeTab, { isAdmin }) {
  return Boolean(isAdmin) && isApiMode();
}

export function isGlobalDiscoverTab(activeTab) {
  return activeTab?.id === "trending" && activeTab?.scope === "global";
}

/** Slot key used by admin pins / exclusions for the current Discover tab. */
export function discoverCurateSlot(activeTab, watchRegion) {
  if (isGlobalDiscoverTab(activeTab)) {
    return { region: GLOBAL_DISCOVER_REGION, listKind: "global", genreId: null };
  }
  const region = (watchRegion || "US").toUpperCase();
  if (activeTab?.genreId != null) {
    return { region, listKind: "genre", genreId: activeTab.genreId };
  }
  return { region, listKind: "regional", genreId: null };
}
