/**
 * Full-bleed landing backdrop. The reference uses a coastline photograph; this
 * is its palette-native equivalent — a deep ink sky with pastel aurora glows and
 * a layered horizon, so white headline text keeps a very high contrast ratio.
 *
 * Layered back-to-front so the hero copy always wins:
 *   z-0   gradient wash + sun
 *   z-10  world-map graticule, dot matrix, drifting clouds
 *   z-20  dotted flight route, destination markers, horizon
 *   z-30  contrail + airplane
 *   z-40  readability scrim under the copy
 *   (the hero content itself sits above the scene at z-10 of the section)
 *
 * The whole scene is inert — `aria-hidden` plus `pointer-events-none` — and every
 * animation is a CSS transform/opacity keyframe declared in `globals.css` under
 * "hero flight scene", so nothing here needs an animation runtime and
 * `prefers-reduced-motion` parks the scene on a static pose.
 */

/** Flight path, in the 1200×500 viewBox shared by the route and contrail SVGs.
 *  x runs -60 → 1260 (-5% → 105%) so the plane enters and leaves off-canvas, and
 *  its control points are evenly spaced on x, which makes x linear in t — that is
 *  what lets the plane's CSS keyframes track this curve exactly. */
const ROUTE = "M-60 350C380 170 820 250 1260 70";

/** Sampled from ROUTE, expressed as a share of the flight band. */
const routeStops = [
  { left: "10.4%", top: "57.7%", delay: "0s", minor: true },
  { left: "34.6%", top: "46.5%", delay: "1.2s", minor: false },
  { left: "63.2%", top: "38.2%", delay: "2.4s", minor: false },
  { left: "89.6%", top: "26.3%", delay: "3.6s", minor: true },
];

/** The route, the contrail and the plane all share this band so they stay aligned.
 *  Its height is defined in `globals.css` — see `.hs-band`. */
const flightBand = "hs-band";

export function HeroScene() {
  return (
    <div className="hs-scene ink-panel pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* 1 — background gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_22%,rgba(144,202,249,0.4),transparent_45%),radial-gradient(circle_at_78%_18%,rgba(187,222,251,0.32),transparent_42%),radial-gradient(circle_at_60%_85%,rgba(144,202,249,0.22),transparent_45%)]" />
      <div className="absolute left-[68%] top-[16%] z-0 h-24 w-24 rounded-full bg-brand-200/70 blur-md" />

      {/* 2 — world map + clouds */}
      <div className="hs-map absolute inset-0 z-10">
        <svg className="h-full w-full opacity-[0.16]" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" role="presentation">
          <g fill="none" stroke="#90caf9" strokeWidth="1">
            {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
              <path key={`m${k}`} d={`M${600 + k * 180} -20C${600 + k * 268} 150 ${600 + k * 268} 350 ${600 + k * 180} 520`} />
            ))}
            {[60, 130, 200, 270, 340, 410].map((y) => (
              <path key={`p${y}`} d={`M-20 ${y}C300 ${y - 20} 900 ${y - 20} 1220 ${y}`} />
            ))}
          </g>
        </svg>
        <div className="hs-dotmap absolute inset-0" />
      </div>

      <div className="absolute inset-0 z-10">
        <span className="hs-cloud hs-cloud--1" />
        <span className="hs-cloud hs-cloud--2" />
        <span className="hs-cloud hs-cloud--3" />
        <span className="hs-cloud hs-cloud--4 hidden sm:block" />
        <span className="hs-cloud hs-cloud--5 hidden sm:block" />
      </div>

      {/* 3 — flight route + destination markers */}
      <div className={`${flightBand} z-20`}>
        <svg className="h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" role="presentation">
          <path
            d={ROUTE}
            fill="none"
            stroke="rgba(144,202,249,0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1 13"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {routeStops.map((stop) => (
          <span
            key={stop.left}
            className={`absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 ${stop.minor ? "hidden sm:block" : ""}`}
            style={{ left: stop.left, top: stop.top }}
          >
            <span
              className="hs-pin-ring absolute inset-0 rounded-full bg-brand-200/50"
              style={{ animationDelay: stop.delay }}
            />
            <span className="absolute inset-0 rounded-full bg-brand-200/90 shadow-[0_0_10px_rgba(187,222,251,0.8)]" />
          </span>
        ))}
      </div>

      {/* 4 — contrail + airplane. The trail keeps a scaling stroke on purpose:
          `pathLength` normalises the dash against the path's *user-space* arc
          length, which tracks the plane's x-linear timing to within half a
          percent, whereas a non-scaling stroke measures the squashed on-screen
          arc and leaves the trail head a plane-length behind the aircraft. */}
      <div className={`${flightBand} z-30`}>
        <svg className="h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" role="presentation">
          <path
            className="hs-trail hs-trail--wide"
            d={ROUTE}
            pathLength={1000}
            style={{ strokeDashoffset: -260 }}
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray="320 1000"
          />
          <path
            className="hs-trail hs-trail--mid"
            d={ROUTE}
            pathLength={1000}
            style={{ strokeDashoffset: -360 }}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="220 1000"
          />
          <path
            className="hs-trail hs-trail--core"
            d={ROUTE}
            pathLength={1000}
            style={{ strokeDashoffset: -460 }}
            fill="none"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="120 1000"
          />
        </svg>

        <div className="hs-planeX absolute inset-0">
          <div className="hs-planeY absolute inset-0">
            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
              <div className="hs-planeBob">
                <div className="hs-planeRot hs-plane">
                  <span className="hs-plane-glow" />
                  <Airplane />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* horizon — the foreground landform, drawn over the sky layers */}
      <svg
        className="absolute inset-x-0 bottom-0 z-20 h-[45%] w-full"
        viewBox="0 0 1200 320"
        preserveAspectRatio="none"
        role="presentation"
      >
        <path d="M0 320V150q180-96 360-30t300-52 240 44 300-24v232Z" fill="#2196f3" opacity="0.32" />
        <path d="M0 320V212q220-84 420-18t340-40 440 40v126Z" fill="#2196f3" opacity="0.34" />
        <path d="M0 320v-64q260-56 480 4t360-26 360 30v56Z" fill="#0d47a1" opacity="0.45" />
      </svg>

      {/* 5 — scrim: keeps the copy above at full contrast wherever the plane passes */}
      <div className="absolute inset-0 z-40 bg-[radial-gradient(ellipse_60%_50%_at_50%_46%,rgba(8,42,94,0.5),transparent_75%)]" />
    </div>
  );
}

/** Top-down airliner silhouette, nose pointing right along the flight path. */
function Airplane() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" role="presentation">
      <defs>
        <linearGradient id="hsPlaneBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="52%" stopColor="#eaf4fe" />
          <stop offset="100%" stopColor="#90caf9" />
        </linearGradient>
      </defs>
      <g
        fill="url(#hsPlaneBody)"
        stroke="url(#hsPlaneBody)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* wings */}
        <path d="M38 32 18 56l-3.6-1.6L23 32Z" />
        <path d="M38 32 18 8l-3.6 1.6L23 32Z" />
        {/* tailplane */}
        <path d="M14 32 7 42.5l-2.3-1L9.6 32Z" />
        <path d="M14 32 7 21.5l-2.3 1L9.6 32Z" />
        {/* fuselage */}
        <path d="M62.5 32c0 1.6-3 2.9-8 3.6-5 .7-12 1-21 1H12a4.6 4.6 0 0 1 0-9.2h21.5c9 0 16 .3 21 1 5 .7 8 2 8 3.6Z" />
      </g>
    </svg>
  );
}
