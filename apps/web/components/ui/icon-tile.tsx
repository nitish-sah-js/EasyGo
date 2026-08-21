import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  lavender: "bg-lavender-100 text-lavender-700",
  periwinkle: "bg-periwinkle-100 text-periwinkle-700",
  aqua: "bg-aqua-100 text-aqua-800",
  mint: "bg-mint-100 text-mint-800",
  orchid: "bg-orchid-100 text-orchid-700",
  peach: "bg-peach-100 text-peach-700",
  blush: "bg-blush-100 text-blush-700",
  sky: "bg-sky-100 text-sky-800",
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
  tone = "lavender",
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
