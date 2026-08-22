"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, revealViewport, type fadeUpSm } from "@/lib/motion";

type RevealVariants = typeof fadeUp | typeof fadeUpSm;

export interface RevealProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView" | "viewport"> {
  variants?: RevealVariants;
  /** Extra delay (seconds) before this element's own transition starts. */
  delay?: number;
  /**
   * Defaults to `true` (mount-time entrance) rather than scroll-triggered.
   * `whileInView` (IntersectionObserver-driven) reliably never fires in
   * Safari/WebKit for content that mounts via this app's client-side route
   * transitions (AnimatePresence in PageTransition wraps every navigation) —
   * confirmed: the element ends up with `opacity: 1` in computed style but
   * never actually paints, so the section is invisible even though nothing
   * looks wrong when inspected. Pass `false` only for content you've
   * verified doesn't hit that path (e.g. truly static pages never reached
   * via client-side nav), and re-test in Safari specifically.
   */
  onMount?: boolean;
  as?: "div" | "section" | "li" | "article";
}

/**
 * Fade + slight upward reveal. The single building block for "section
 * reveal" across the site — compose with `StaggerGroup` for card grids.
 */
export function Reveal({ variants = fadeUp, delay = 0, onMount = true, as = "div", className, children, ...props }: RevealProps) {
  // Framer merges a variant's own `transition` over this default rather than
  // replacing it, so `delay` (absent from the variant) survives while
  // `duration`/`ease` (present on the variant) still win — no need to clone
  // the variant object just to inject a delay.
  const MotionTag = motion[as] as React.ElementType;

  return (
    <MotionTag
      className={className}
      variants={variants}
      transition={{ delay }}
      initial="hidden"
      {...(onMount ? { animate: "visible" } : { whileInView: "visible", viewport: revealViewport })}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
