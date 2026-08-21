"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { HeroScene } from "@/components/hero-scene";

/**
 * Wraps the (purely CSS-driven) hero scene in a scroll-linked drift: as the
 * hero scrolls past, its backdrop lags slightly behind the copy in front of
 * it, which is the whole of the "parallax" — a few pixels of translateY, not
 * a depth effect. `useScroll`'s `target` ties the range to this element's own
 * scroll span rather than the whole document, so it settles back to 0 the
 * moment the section leaves view.
 */
export function HeroParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 64]);

  return (
    <motion.div ref={ref} style={{ y }} className="absolute inset-0">
      <HeroScene />
    </motion.div>
  );
}
