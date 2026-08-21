"use client";

import { useEffect, useState } from "react";
import { Route } from "lucide-react";

/**
 * Shortest time the loader stays up. Purely to stop a sub-100ms load from
 * flashing the overlay in and straight back out, which reads as a glitch. On a
 * slow load it adds nothing — dismissal is driven by the real `load` event.
 */
const MIN_VISIBLE_MS = 420;
/** Must match the opacity transition on `.jl-root` in journey-loader.css. */
const FADE_MS = 620;

/**
 * The two authored flight paths. `d` is mirrored by `--jl-path` in the
 * stylesheet, which is what the aircraft actually follows; the CSS media query
 * decides which lane is on screen. Markers sit on the curve, each delayed by how
 * far along it they are, so one blooms as the aircraft reaches it.
 */
const lanes = [
  {
    key: "wide",
    d: "M -80 470 C 240 330, 470 210, 760 226 C 1010 240, 1180 150, 1520 34",
    markers: [
      { x: 181, y: 356, at: 0.17 },
      { x: 579, y: 233, at: 0.42 },
      { x: 947, y: 217, at: 0.64 },
      { x: 1315, y: 107, at: 0.87 },
    ],
  },
  {
    key: "tall",
    d: "M 560 1010 C 640 800, 660 655, 700 520 C 745 375, 800 195, 870 -70",
    markers: [
      { x: 620, y: 829, at: 0.17 },
      { x: 690, y: 556, at: 0.42 },
      { x: 761, y: 320, at: 0.64 },
      { x: 832, y: 71, at: 0.87 },
    ],
  },
] as const;

export function JourneyLoader() {
  const [state, setState] = useState<"visible" | "leaving" | "done">("visible");

  useEffect(() => {
    const shownAt = performance.now();
    let leaveTimer = 0;
    let doneTimer = 0;

    function dismiss() {
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt));
      leaveTimer = window.setTimeout(() => {
        setState("leaving");
        doneTimer = window.setTimeout(() => setState("done"), FADE_MS);
      }, remaining);
    }

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
    }

    return () => {
      window.removeEventListener("load", dismiss);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  // Hold the page still underneath, but only while the overlay is opaque.
  useEffect(() => {
    if (state === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [state]);

  if (state === "done") return null;

  return (
    <div
      className="jl-root"
      data-state={state}
      role="status"
      aria-live="polite"
      aria-label="Preparing your journey"
    >
      <div className="jl-map" aria-hidden />

      <div className="jl-clouds" aria-hidden>
        <Cloud className="jl-cloud jl-cloud--far" style={{ top: "14%", left: "6%", width: 150, animationDelay: "-12s" }} />
        <Cloud className="jl-cloud jl-cloud--far" style={{ top: "62%", left: "72%", width: 118, animationDelay: "-58s" }} />
        <Cloud className="jl-cloud jl-cloud--mid" style={{ top: "31%", left: "38%", width: 226, animationDelay: "-30s" }} />
        <Cloud className="jl-cloud jl-cloud--mid" style={{ top: "78%", left: "14%", width: 190, animationDelay: "-6s" }} />
        <Cloud className="jl-cloud jl-cloud--near" style={{ top: "8%", left: "62%", width: 330, animationDelay: "-22s" }} />
        <Cloud className="jl-cloud jl-cloud--near" style={{ top: "70%", left: "78%", width: 290, animationDelay: "-36s" }} />
      </div>

      <svg
        className="jl-scene"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        focusable="false"
      >
        <defs>
          <linearGradient id="jl-plane-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9100" />
            <stop offset="100%" stopColor="#FF6D00" />
          </linearGradient>
          <filter id="jl-plane-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#240046" floodOpacity="0.35" />
          </filter>
          <filter id="jl-trail-blur" x="-12%" y="-40%" width="124%" height="180%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {lanes.map((lane) => (
          <g key={lane.key} className={`jl-lane jl-lane--${lane.key}`}>
            {/* Identical geometry three times over: a faint dotted guide, a soft
                blurred contrail, then the crisp contrail on top. */}
            <path
              className="jl-route"
              d={lane.d}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.75"
              strokeWidth="2.5"
            />
            <path
              className="jl-trail jl-trail--haze"
              pathLength={1}
              d={lane.d}
              fill="none"
              filter="url(#jl-trail-blur)"
            />
            <path className="jl-trail jl-trail--body" pathLength={1} d={lane.d} fill="none" />
            <path className="jl-trail jl-trail--tip" pathLength={1} d={lane.d} fill="none" />

            {lane.markers.map((marker) => (
              <g key={`${marker.x}-${marker.y}`} transform={`translate(${marker.x} ${marker.y})`}>
                <g
                  className="jl-pin"
                  // Expressed against the flight clock rather than a duplicated
                  // seconds constant, so retiming --jl-flight moves the markers
                  // with the aircraft instead of desyncing them.
                  style={{ animationDelay: `calc(var(--jl-flight) * ${marker.at})` }}
                >
                  <circle className="jl-pin__pulse" cy="-15" r="7" />
                  <path
                    d="M0 0c0 0 8.5-9.4 8.5-15A8.5 8.5 0 1 0-8.5-15C-8.5-9.4 0 0 0 0Z"
                    fill="#9D4EDD"
                  />
                  <circle cy="-15" r="3.2" fill="#ffffff" />
                </g>
              </g>
            ))}
          </g>
        ))}

        {/* Top-down silhouette: the aircraft reads as a marker on a route map,
            which is the same language as the pins above. */}
        <g className="jl-plane">
          <g className="jl-plane__bob" filter="url(#jl-plane-shadow)">
            <path
              d="M30 0c0-2.2-2.4-3.8-6.8-4.2L8.5-5-7-22.5h-7l4 17.3-7.5.3-5-6.1H-27l2.4 6.7C-28 -3.6-29.5-2-29.5 0s1.5 3.6 4.9 4.3L-27 11h4.5l5-6.1 7.5.3-4 17.3h7L8.5 5l14.7-.8C27.6 3.8 30 2.2 30 0Z"
              fill="url(#jl-plane-gradient)"
            />
            <path d="M8.5-5 23.2-4.2C27.6-3.8 30-2.2 30 0H-2Z" fill="#ffffff" fillOpacity="0.18" />
          </g>
        </g>
      </svg>

      <div className="jl-content">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/80 bg-white/70 px-10 py-8 text-center shadow-[0_30px_70px_-30px_rgba(36,0,70,0.55)] backdrop-blur-2xl backdrop-saturate-150">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-card">
              <Route className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-brand-900">
              Next<span className="text-brand-700">Tour</span>
            </span>
          </div>

          <p className="text-sm font-medium text-brand-800">Preparing your journey...</p>

          <div className="flex items-center gap-2" aria-hidden>
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="jl-dot h-2 w-2 rounded-full bg-brand-600" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cloud({ className, style }: { className: string; style: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 74" fill="currentColor" aria-hidden>
      <path d="M46 74a30 30 0 0 1-2.6-59.9A38 38 0 0 1 113 6.6 26 26 0 0 1 154 26a24 24 0 0 1 6 48H46Z" />
    </svg>
  );
}
