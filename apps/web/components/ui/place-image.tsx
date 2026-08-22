"use client";

import * as React from "react";
import { Scenic } from "@/components/ui/scenic";
import { cn } from "@/lib/utils";

/**
 * A real photograph of a place, over a `Scenic` that stands in when there isn't one.
 *
 * Photos come from Wikimedia Commons via the API's photo endpoint, which
 * resolves a file title and redirects to Wikimedia's CDN. Two things can go
 * wrong — the place has no matching Commons photo, or the resolved URL has
 * expired — and both land as a failed image load. So the illustrated scene is
 * painted first and the photo fades in on top of it: a failure reveals the
 * fallback that was already there instead of collapsing the card's height.
 */
export function PlaceImage({
  src,
  alt,
  seed,
  className,
  scrim = false,
  credit,
  fallback = "scene",
  children,
}: {
  /** Undefined when the place carries no photo — renders the fallback alone. */
  src?: string | undefined;
  alt: string;
  /** Keeps the fallback scene stable for a given place. */
  seed: string;
  className?: string;
  scrim?: boolean;
  /** Photographer attribution, shown as a hover title where there's no room to print it. */
  credit?: string | undefined;
  /**
   * What to show when there is no photo. "scene" paints the illustrated fallback,
   * which suits a card whose layout depends on the image filling a fixed area.
   * "none" collapses to nothing — for decorative thumbnails, where an abstract
   * horizon next to every row would read as noise rather than as a picture.
   */
  fallback?: "scene" | "none";
  children?: React.ReactNode;
}) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  // A card can be re-pointed at another place while mounted (the destination grid
  // re-filters in place), so the load state has to follow the src, not the mount.
  React.useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  // The browser can finish fetching `src` — from cache, or just faster than
  // hydration — before React attaches the `onLoad` listener below, since
  // that only happens once this component actually mounts/hydrates. A
  // load event that already fired is never redelivered, so without this
  // check the image would sit at opacity-0 forever despite being fully
  // loaded. `img.complete` is true for both success and failure, so a
  // zero-size complete image (a 404, for instance) is still routed to
  // `onError`'s path rather than treated as loaded.
  const checkAlreadyLoaded = React.useCallback((img: HTMLImageElement | null) => {
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, []);

  const showPhoto = Boolean(src) && !failed;
  if (!showPhoto && fallback === "none") return null;
  const isLoadingPhoto = showPhoto && !loaded;

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      {fallback === "scene" ? <Scenic seed={seed} className="absolute inset-0 h-full w-full" /> : null}
      {/* A shimmer over the scene while the photo is in flight — distinguishes
          "still loading" from "this is the picture", so a slow connection doesn't
          read as the abstract horizon being the final image. */}
      {isLoadingPhoto ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/0 via-white/25 to-white/0" />
      ) : null}
      {showPhoto ? (
        // The API redirects to Wikimedia's photo CDN, whose host next/image cannot be
        // given as a remote pattern ahead of time.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={checkAlreadyLoaded}
          src={src}
          alt={alt}
          {...(credit ? { title: credit } : {})}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out",
            // Zooms only when an ancestor opts in with `.group` — cards that
            // want the hover effect just need the Tailwind `group` class;
            // everything else (thumbnails with no hover affordance) is unaffected.
            "group-hover:scale-105 motion-reduce:transition-opacity motion-reduce:group-hover:scale-100",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
      {scrim ? (
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/30 to-brand-900/5" />
      ) : null}
      {children ? <div className="relative h-full">{children}</div> : null}
    </div>
  );
}
