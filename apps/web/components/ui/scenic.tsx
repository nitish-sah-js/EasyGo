import * as React from "react";
import { stableHash } from "@nexttour/shared";
import { cn } from "@/lib/utils";

/**
 * A decorative landscape built entirely from the brand palette.
 *
 * The reference design fills its destination and stay cards with photography.
 * Nothing in the domain model carries an image URL, and dropping stock photos
 * onto a named real hotel or attraction would assert something untrue about it,
 * so each card gets an abstract horizon instead — deterministic per `seed`, so
 * the same place always renders the same scene.
 */
const scenes = [
  { sky: "from-lavender-200 via-orchid-200 to-peach-200", sun: "bg-butter-200", hills: ["#a884e1", "#7b4aca"] },
  { sky: "from-periwinkle-200 via-sky-200 to-aqua-200", sun: "bg-white", hills: ["#5b93e1", "#2d69be"] },
  { sky: "from-aqua-200 via-mint-200 to-leaf-200", sun: "bg-butter-200", hills: ["#57e6c7", "#229b81"] },
  { sky: "from-peach-200 via-blush-200 to-orchid-200", sun: "bg-butter-100", hills: ["#f5ac70", "#a2581b"] },
  { sky: "from-sky-200 via-lavender-200 to-blush-200", sun: "bg-white", hills: ["#a884e1", "#532f8d"] },
  { sky: "from-butter-200 via-peach-200 to-blush-200", sun: "bg-white", hills: ["#ee964e", "#8d2f7c"] },
  { sky: "from-mint-200 via-aqua-200 to-periwinkle-200", sun: "bg-butter-100", hills: ["#38dbb8", "#265597"] },
  { sky: "from-orchid-200 via-lavender-200 to-periwinkle-200", sun: "bg-blush-100", hills: ["#9166d6", "#42266d"] },
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
        <div className="absolute inset-0 bg-gradient-to-t from-lavender-900/85 via-lavender-900/25 to-transparent" />
      ) : null}
      {children ? <div className="relative h-full">{children}</div> : null}
    </div>
  );
}
