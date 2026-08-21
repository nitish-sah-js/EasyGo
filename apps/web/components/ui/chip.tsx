import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  soft: "border-brand-100 bg-brand-50 text-brand-800",
  base: "border-brand-200 bg-brand-100 text-brand-900",
  mid: "border-brand-300 bg-brand-200 text-brand-900",
  deep: "border-brand-700 bg-brand-700 text-white",
  success: "border-mint-200 bg-mint-100 text-mint-900",
  danger: "border-blush-200 bg-blush-100 text-blush-900",
  neutral: "border-border bg-muted text-muted-foreground",
  // Darkens whatever sits behind it rather than lightening, so white chip text
  // clears AA even on the palest scenic card with no scrim under it.
  onInk: "border-white/25 bg-brand-900/70 text-white backdrop-blur",
} as const;

export type ChipTone = keyof typeof tones;

export function Chip({
  tone = "base",
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
        "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold",
        "transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0",
        "disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-muted-foreground",
        active
          ? "border-accent-500 bg-accent-500 text-white shadow-card"
          : "border-border bg-surface text-muted-foreground hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
        className,
      )}
      {...props}
    />
  );
}
