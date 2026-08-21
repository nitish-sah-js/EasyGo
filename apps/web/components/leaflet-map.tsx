"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { Map as MapIcon, Maximize, Minimize, Satellite } from "lucide-react";
import { markerStyle, type MapMarker } from "@/components/map-visualization";
import { cn } from "@/lib/utils";

type TileType = "satellite" | "road";

const TILE_CONFIG: Record<TileType, { url: string; attribution: string; maxZoom: number }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  road: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
};

/**
 * `L.divIcon` re-renders this markup to a fresh node on every `active`
 * toggle, so a CSS *transition* would have nothing to interpolate from — a
 * keyframe `animation` plays correctly on that fresh node instead, which is
 * what gives the marker its placement pop and its "just selected" bounce.
 */
function markerIcon(type: MapMarker["type"], active: boolean, placeDelayMs: number): L.DivIcon {
  const style = markerStyle[type];
  const Icon = style.icon;
  const html = renderToStaticMarkup(
    <span
      className={cn("nt-marker-in", active && "nt-marker-selected")}
      style={{ animationDelay: active ? "0ms" : `${placeDelayMs}ms` }}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full shadow-lift ring-2 ring-white/90",
          style.pin,
          style.text,
          type === "destination" && "shadow-[0_0_18px_rgba(255,109,0,0.55)]",
          active && "scale-110 ring-4 ring-[#FF6D00] shadow-[0_0_22px_rgba(255,109,0,0.75)]",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
    </span>,
  );
  return L.divIcon({ html, className: "", iconSize: [36, 36], iconAnchor: [18, 18] });
}

/**
 * One marker, memoizing its own icon so a *different* marker being selected
 * doesn't recreate this one's DOM node (`L.Marker.setIcon` swaps the element
 * outright) — without that, every pin on the map would replay its pop-in
 * animation on every click, not just the one that was actually toggled.
 */
function AnimatedMarker({
  marker,
  active,
  placeDelayMs,
  onSelect,
}: {
  marker: MapMarker;
  active: boolean;
  placeDelayMs: number;
  onSelect: () => void;
}) {
  const hasMounted = useRef(false);
  const icon = useMemo(() => {
    const delay = hasMounted.current ? 0 : placeDelayMs;
    hasMounted.current = true;
    return markerIcon(marker.type, active, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker.type, active]);

  return (
    <Marker position={[marker.latitude, marker.longitude]} icon={icon} eventHandlers={{ click: onSelect }} />
  );
}

/** Frames every marker once on mount, keeping the destination as the initial center. */
function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length < 2) return;
    const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function MapControls({
  mapType,
  onChangeType,
  containerRef,
}: {
  mapType: TileType;
  onChangeType: (type: TileType) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement) && document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [containerRef]);

  function toggleFullscreen() {
    const node = containerRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (node.requestFullscreen) {
      node.requestFullscreen().catch(() => {});
    }
  }

  const supportsFullscreen = typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen);

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#240046]/80 p-1 shadow-lift ring-1 ring-white/20 backdrop-blur">
        {(["satellite", "road"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChangeType(type)}
            aria-pressed={mapType === type}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
              "transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6D00]/70",
              mapType === type
                ? "bg-primary-orange text-white shadow-card"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            {type === "satellite" ? <Satellite className="h-3.5 w-3.5" /> : <MapIcon className="h-3.5 w-3.5" />}
            {type}
          </button>
        ))}
      </div>
      {supportsFullscreen ? (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#240046]/80 text-white shadow-lift ring-1 ring-white/20 backdrop-blur transition duration-200 ease-out hover:bg-[#240046] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6D00]/70"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      ) : null}
    </div>
  );
}

export function LeafletMap({
  markers,
  selectedId,
  onSelect,
}: {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [mapType, setMapType] = useState<TileType>("satellite");
  const containerRef = useRef<HTMLDivElement>(null);
  const tile = TILE_CONFIG[mapType];

  const routePoints = useMemo<[number, number][]>(
    () => markers.slice(0, 7).map((marker) => [marker.latitude, marker.longitude]),
    [markers],
  );

  // `MapVisualization` never renders this component without at least the
  // destination marker (it shows an empty state instead when there are none) —
  // this guard only satisfies strict-mode indexing and must come after every
  // hook above so hook order never changes between renders.
  const [anchor] = markers;
  if (!anchor) return null;
  const center: [number, number] = [anchor.latitude, anchor.longitude];

  return (
    <div ref={containerRef} className="absolute inset-0">
      <MapContainer center={center} zoom={14} scrollWheelZoom className="h-full w-full">
        <TileLayer key={mapType} url={tile.url} attribution={tile.attribution} maxZoom={tile.maxZoom} />
        <FitToMarkers markers={markers} />
        {routePoints.length > 1 ? (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: "#FF9E00", weight: 2, opacity: 0.9, dashArray: "5 5", className: "nt-route-draw" }}
          />
        ) : null}
        {markers.map((marker, index) => (
          <AnimatedMarker
            key={marker.id}
            marker={marker}
            active={marker.id === selectedId}
            placeDelayMs={index * 90}
            onSelect={() => onSelect(marker.id === selectedId ? null : marker.id)}
          />
        ))}
      </MapContainer>
      <MapControls mapType={mapType} onChangeType={setMapType} containerRef={containerRef} />
    </div>
  );
}
