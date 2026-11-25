import { MotionConfig } from "framer-motion";
import { EASE_SMOOTH } from "../constants/motion";
import WatchlistProvider from "../store/WatchlistProvider";
import ProfileProvider from "../store/ProfileProvider";

export default function AppProviders({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.55, ease: EASE_SMOOTH }}>
      <ProfileProvider>
        <WatchlistProvider>{children}</WatchlistProvider>
      </ProfileProvider>
    </MotionConfig>
  );
}
