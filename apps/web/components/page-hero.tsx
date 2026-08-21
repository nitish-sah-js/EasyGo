import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The dark summary banner that opens a results or detail screen in the
 * reference design ("London to Paris" with its meta line and action button).
 */
export function PageHero({
  eyebrow,
  title,
  meta,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ink-panel flex flex-wrap items-center justify-between gap-5 rounded-2xl px-6 py-7 shadow-ink sm:px-8",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        {meta ? <p className="text-sm text-brand-200">{meta}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}
