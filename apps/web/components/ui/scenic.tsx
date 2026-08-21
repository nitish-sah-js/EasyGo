import * as React from "react";
import { stableHash } from "@nexttour/shared";
import { cn } from "@/lib/utils";

/**
 * A decorative landscape built entirely from the brand palette.
 *
 * Cards prefer a real Google Places photo of the place (see `PlaceImage`); this
 * is what shows when there isn't one — the place has no photo, no Places key is
 * configured, or the resolved URL failed to load. Stock photography is
 * deliberately not used as the stand-in: putting an arbitrary beach under a named
 * hotel would assert something untrue about it. The scene is deterministic per
 * `seed`, so the same place always falls back to the same horizon.
 *
 * Every scene is the same hue. What separates one card from the next is how far
 * up the ramp its sky climbs and how dark its hills sit, which is enough to keep
 * a grid of eight cards from reading as eight copies of one card.
 */
const scenes = [
  { sky: "from-brand-50 via-brand-100 to-brand-200", sun: "bg-white", hills: ["#5DD6E8", "#087EA4"] },
  { sky: "from-brand-100 via-brand-200 to-brand-300", sun: "bg-brand-50", hills: ["#34C7DE", "#0B4E6A"] },
  { sky: "from-brand-200 via-brand-300 to-brand-400", sun: "bg-white", hills: ["#16B8D4", "#0B1F33"] },
  { sky: "from-brand-50 via-brand-200 to-brand-400", sun: "bg-brand-50", hills: ["#0FA0BE", "#0B1F33"] },
  { sky: "from-brand-100 via-brand-300 to-brand-500", sun: "bg-white", hills: ["#087EA4", "#0B1F33"] },
  { sky: "from-brand-200 via-brand-100 to-brand-300", sun: "bg-brand-50", hills: ["#5DD6E8", "#0B4E6A"] },
  { sky: "from-brand-300 via-brand-400 to-brand-600", sun: "bg-brand-100", hills: ["#0B4E6A", "#0B1F33"] },
  { sky: "from-brand-50 via-brand-300 to-brand-500", sun: "bg-white", hills: ["#16B8D4", "#0B4E6A"] },
] as const;

export function Scenic({
  seed,
  className,
  scrim = false,
  children,
}: {
  seed: string;
  className?: string;
  /** Darkens the lower half so white overlay text stays legible. */
  scrim?: boolean;
  children?: React.ReactNode;
}) {
  const scene = scenes[stableHash(seed) % scenes.length]!;

  return (
    <div className={cn("relative isolate overflow-hidden bg-gradient-to-b", scene.sky, className)}>
      <div className={cn("absolute right-[16%] top-[18%] h-14 w-14 rounded-full opacity-80 blur-[1px]", scene.sun)} />
      <svg
        className="absolute inset-x-0 bottom-0 h-[62%] w-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        role="presentation"
      >
        <path d="M0 200V118q64-52 128-16t144-30 128 24v104Z" fill={scene.hills[0]} opacity="0.55" />
        <path d="M0 200v-46q72-40 148-4t124-18 128 22v46Z" fill={scene.hills[1]} opacity="0.6" />
      </svg>
      {scrim ? (
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/25 to-transparent" />
      ) : null}
      {children ? <div className="relative h-full">{children}</div> : null}
    </div>
  );
}
