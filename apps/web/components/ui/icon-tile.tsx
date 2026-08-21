import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  soft: "bg-brand-50 text-brand-800",
  base: "bg-brand-100 text-brand-900",
  mid: "bg-brand-200 text-brand-900",
  deep: "bg-brand-700 text-white",
  success: "bg-mint-100 text-mint-800",
  danger: "bg-blush-100 text-blush-700",
  onInk: "bg-white/15 text-white ring-1 ring-inset ring-white/20",
} as const;

export type IconTone = keyof typeof tones;

const sizes = {
  sm: "h-9 w-9 rounded-lg",
  default: "h-11 w-11 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
} as const;

/**
 * The rounded square that sits to the left of a title in the reference layouts
 * (transport rows, itinerary entries, stat cards).
 */
export function IconTile({
  tone = "base",
  size = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: IconTone; size?: keyof typeof sizes }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        sizes[size],
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
