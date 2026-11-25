// Shared easing and Framer Motion presets (keep in sync with src/styles/tokens.css).
export const EASE_SMOOTH = [0.22, 1, 0.36, 1];
export const EASE_GENTLE = [0.33, 1, 0.45, 1];

export const motionTransition = {
  duration: 0.55,
  ease: EASE_SMOOTH,
};

export const motionSpring = {
  type: "spring",
  stiffness: 360,
  damping: 28,
  mass: 0.85,
};

export const fadeUp = (delay = 0, y = 20) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { delay, ...motionTransition },
});

export const fadeInView = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-48px" },
  transition: { delay, ...motionTransition },
});

export const staggerIn = (index, cap = 12) => ({
  delay: Math.min(index, cap) * 0.04,
  ...motionTransition,
});

export const hoverLift = {
  y: -4,
  transition: { duration: 0.4, ease: EASE_SMOOTH },
};

export const tapPress = {
  scale: 0.98,
  transition: { duration: 0.12, ease: EASE_GENTLE },
};
