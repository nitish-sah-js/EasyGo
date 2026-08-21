"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, revealViewport, type fadeUpSm } from "@/lib/motion";

type RevealVariants = typeof fadeUp | typeof fadeUpSm;

export interface RevealProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView" | "viewport"> {
  variants?: RevealVariants;
  /** Extra delay (seconds) before this element's own transition starts. */
  delay?: number;
  /** Render as a mount-time entrance instead of a scroll-triggered one — for above-the-fold content. */
  onMount?: boolean;
  as?: "div" | "section" | "li" | "article";
}

/**
 * Fade + slight upward reveal, triggered once when the element enters the
 * viewport (or immediately on mount for `onMount`, e.g. hero content that's
 * already on screen at load). The single building block for "section reveal"
 * across the site — compose with `StaggerGroup` for card grids.
 */
export function Reveal({ variants = fadeUp, delay = 0, onMount = false, as = "div", className, children, ...props }: RevealProps) {
  const MotionTag = motion[as];
  const withDelay = delay
    ? {
        hidden: variants.hidden,
        visible: {
          ...variants.visible,
          transition: {
            ...(typeof variants.visible === "object" && "transition" in variants.visible ? variants.visible.transition : {}),
            delay,
          },
        },
      }
    : variants;

  return (
    <MotionTag
      className={className}
      variants={withDelay}
      initial="hidden"
      {...(onMount ? { animate: "visible" } : { whileInView: "visible", viewport: revealViewport })}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
