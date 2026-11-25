import { Bookmark, Compass, Home, UserRound, Users } from "lucide-react";

/** Set true to show Community in nav again (routes stay at /community). */
export const SHOW_COMMUNITY_NAV = false;

const ALL_MAIN_NAV = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/discover", label: "Discover", Icon: Compass },
  { to: "/watchlist", label: "Watchlist", Icon: Bookmark, badge: "watchlist" },
  { to: "/community", label: "Community", Icon: Users, navKey: "community" },
  { to: "/profile", label: "Profile", Icon: UserRound, requiresSignIn: true },
];

export const MAIN_NAV = SHOW_COMMUNITY_NAV
  ? ALL_MAIN_NAV
  : ALL_MAIN_NAV.filter((item) => item.navKey !== "community");
