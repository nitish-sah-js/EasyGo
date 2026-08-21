"use client";

import * as React from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

export interface AnimatedCounterProps {
  /** The final numeric value to count up to. */
  value: number;
  /** Formats the (rounded) in-flight value for display, e.g. `formatInr`. */
  format?: (value: number) => string;
  className?: string;
  /** Counts once the element scrolls into view rather than immediately. */
  onView?: boolean;
}

/**
 * A number that counts up to `value` via a spring rather than jumping —
 * used for cost totals and summary stats so a screen full of numbers doesn't
 * all land at once. Reduced-motion users get the final value immediately.
 */
export function AnimatedCounter({ value, format = (n) => String(n), className, onView = false }: AnimatedCounterProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px 0px -40px 0px" });
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 22, mass: 0.9 });
  const [display, setDisplay] = React.useState(() => format(prefersReducedMotion ? value : 0));

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(format(value));
      return;
    }
    if (!onView || inView) motionValue.set(value);
  }, [value, onView, inView, motionValue, prefersReducedMotion, format]);

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    return spring.on("change", (latest) => setDisplay(format(Math.round(latest))));
  }, [spring, format, prefersReducedMotion]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
