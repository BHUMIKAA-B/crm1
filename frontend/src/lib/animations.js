// Shared framer-motion variants used across the app for consistent,
// Framer-reference-style motion (fade/slide entrances, staggered lists,
// hover/tap micro-interactions).

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export const stagger = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

export const viewportOnce = { once: true, margin: "-80px" };

export const hoverLift = {
  whileHover: { y: -6, transition: { duration: 0.25, ease: "easeOut" } },
  whileTap: { y: -2 },
};

export const hoverScale = {
  whileHover: { scale: 1.03, transition: { duration: 0.25, ease: "easeOut" } },
  whileTap: { scale: 0.98 },
};

export const tapScale = {
  whileTap: { scale: 0.96 },
};

export const buttonPress = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.96 },
  transition: { duration: 0.15, ease: "easeOut" },
};
