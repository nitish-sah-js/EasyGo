"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, fadeUpSm, revealViewport, staggerContainer } from "@/lib/motion";

export interface StaggerGroupProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView" | "viewport"> {
  /** Seconds between each child's entrance. */
  stagger?: number;
  delayChildren?: number;
  /** See the `onMount` doc on `Reveal` — same default, same WebKit reason. */
  onMount?: boolean;
  as?: "div" | "ol" | "ul" | "section";
}

/**
 * Wraps a set of `StaggerItem`s (cards, list rows, grid tiles) so they reveal
 * in sequence rather than all at once. The container itself is invisible to
 * layout — it only carries the stagger timing down to its children via
 * variant propagation, which is why every `StaggerItem` must stay a direct
 * child (framer-motion only propagates `visible`/`hidden` one level).
 */
export function StaggerGroup({
  stagger = 0.08,
  delayChildren = 0,
  onMount = true,
  as = "div",
  className,
  children,
  ...props
}: StaggerGroupProps) {
  const MotionTag = motion[as] as React.ElementType;
  return (
    <MotionTag
      className={className}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      {...(onMount ? { animate: "visible" } : { whileInView: "visible", viewport: revealViewport })}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

export interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  size?: "sm" | "md";
  as?: "div" | "li" | "article";
}

export function StaggerItem({ size = "md", as = "div", className, children, ...props }: StaggerItemProps) {
  const MotionTag = motion[as] as React.ElementType;
  return (
    <MotionTag className={className} variants={size === "sm" ? fadeUpSm : fadeUp} {...props}>
      {children}
    </MotionTag>
  );
}
