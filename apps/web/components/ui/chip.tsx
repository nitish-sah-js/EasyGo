import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  lavender: "border-lavender-200 bg-lavender-100 text-lavender-800",
  periwinkle: "border-periwinkle-200 bg-periwinkle-100 text-periwinkle-800",
  aqua: "border-aqua-200 bg-aqua-100 text-aqua-900",
  mint: "border-mint-200 bg-mint-100 text-mint-900",
  orchid: "border-orchid-200 bg-orchid-100 text-orchid-800",
  peach: "border-peach-200 bg-peach-100 text-peach-900",
  blush: "border-blush-200 bg-blush-100 text-blush-900",
  sky: "border-sky-200 bg-sky-100 text-sky-900",
  neutral: "border-border bg-muted text-muted-foreground",
  // Darkens whatever sits behind it rather than lightening, so white chip text
  // clears AA even on the palest scenic card with no scrim under it.
  onInk: "border-white/25 bg-lavender-900/70 text-white backdrop-blur",
} as const;

export type ChipTone = keyof typeof tones;

export function Chip({
  tone = "lavender",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Toggleable pill used for the destination and preference filters. */
export function FilterChip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
        active
          ? "border-lavender-700 bg-lavender-700 text-white shadow-card"
          : "border-border bg-surface text-muted-foreground hover:border-lavender-300 hover:text-lavender-700",
        className,
      )}
      {...props}
    />
  );
}
