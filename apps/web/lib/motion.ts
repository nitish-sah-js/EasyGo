import type { Transition, Variants } from "framer-motion";

/**
 * One motion language for the whole site. Every variant here animates only
 * `transform`/`opacity` (compositor-only properties), which is what keeps
 * scroll-linked and staggered animation cheap even on a page with dozens of
 * cards in view. `MotionConfig reducedMotion="user"` (see app-shell) strips
 * the transform component of all of these for prefers-reduced-motion users
 * and leaves the opacity fade, so nothing here needs its own media query.
 */

export const easeOut: Transition["ease"] = [0.16, 1, 0.3, 1];
export const easeInOut: Transition["ease"] = [0.65, 0, 0.35, 1];

export const springSnappy: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.6 };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 30 };

/** Page-load / scroll-reveal: fade in on a short upward travel. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: easeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: easeOut } },
};

/** Wraps a group of children — pair with `fadeUp`/`fadeUpSm` items. */
export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

/** Default viewport: fires once, a little before the element is fully on screen. */
export const revealViewport = { once: true, margin: "-80px 0px -80px 0px" } as const;

export const collapse: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: easeInOut } },
};

export const dropdown: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.16, ease: easeOut } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12, ease: easeInOut } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springSnappy },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.15 } },
};
