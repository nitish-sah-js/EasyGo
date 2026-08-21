"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Hotel, MapPin, Navigation, Utensils, X } from "lucide-react";
import type { Attraction, Hotel as HotelType, Restaurant, TripResultPayload } from "@nexttour/shared";
import { Chip } from "@/components/ui/chip";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type MarkerType = "destination" | "hotel" | "attraction" | "restaurant";

export type MapMarker = {
  id: string;
  label: string;
  detail?: string;
  latitude: number;
  longitude: number;
  type: MarkerType;
};

export const markerStyle: Record<MarkerType, { pin: string; text: string; icon: typeof MapPin; label: string }> = {
  destination: { pin: "bg-[#FF6D00]", text: "text-white", icon: Navigation, label: "Destination" },
  hotel: { pin: "bg-[#9D4EDD]", text: "text-white", icon: Hotel, label: "Stay" },
  attraction: { pin: "bg-[#9D4EDD]", text: "text-white", icon: MapPin, label: "Place" },
  restaurant: { pin: "bg-[#9D4EDD]", text: "text-white", icon: Utensils, label: "Food" },
};

// Leaflet touches `window` at import time, which crashes Next.js's server
// render even inside a "use client" component — it must never load on the server.
const LeafletMap = dynamic(() => import("@/components/leaflet-map").then((mod) => mod.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-[#D8CFE3]/70">
      Loading map…
    </div>
  ),
});

export function MapVisualization({
  trip,
  hotel,
  attractions,
  restaurants,
}: {
  trip: TripResultPayload["trip"];
  hotel?: HotelType;
  attractions: Attraction[];
  restaurants: Restaurant[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Every coordinate comes from a real provider; with none there is nothing
  // truthful to plot, so the map shows an empty state instead of a placeholder city.
  const destinationLat = hotel?.latitude ?? attractions[0]?.latitude ?? restaurants[0]?.latitude;
  const destinationLng = hotel?.longitude ?? attractions[0]?.longitude ?? restaurants[0]?.longitude;

  if (destinationLat === undefined || destinationLng === undefined) {
    return (
      <div className="flex aspect-[16/11] min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#3C096C]/40 bg-[#240046] p-6 text-center text-sm text-[#D8CFE3]/70">
        No mapped locations yet — the hotel and place providers returned no results for this trip.
      </div>
    );
  }

  const markers: MapMarker[] = [
    {
      id: "destination",
      label: trip.destination,
      detail: "Trip destination",
      latitude: destinationLat,
      longitude: destinationLng,
      type: "destination",
    },
    ...(hotel
      ? [
          {
            id: hotel.id,
            label: hotel.name,
            detail: hotel.location,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            type: "hotel" as const,
          },
        ]
      : []),
    ...attractions.slice(0, 6).map((attraction) => ({
      id: attraction.id,
      label: attraction.name,
      detail: attraction.category.replace("_", " "),
      latitude: attraction.latitude,
      longitude: attraction.longitude,
      type: "attraction" as const,
    })),
    ...restaurants.slice(0, 3).map((restaurant) => ({
      id: restaurant.id,
      label: restaurant.name,
      detail: restaurant.cuisine,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      type: "restaurant" as const,
    })),
  ];

  const selected = markers.find((marker) => marker.id === selectedId);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/11] min-h-[300px] overflow-hidden rounded-2xl border border-[#3C096C]/40 bg-[#240046] shadow-[0_20px_60px_-20px_rgba(36,0,70,0.55)]">
        <LeafletMap markers={markers} selectedId={selectedId} onSelect={setSelectedId} />

        <AnimatePresence>
          {selected ? (
            <motion.div
              key={selected.id}
              variants={popIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute bottom-4 left-1/2 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[#9D4EDD]/25 bg-[#240046]/92 p-4 shadow-[0_20px_50px_-20px_rgba(36,0,70,0.65)] backdrop-blur"
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedId(null)}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-[#D8CFE3] transition duration-200 ease-out hover:bg-white/10 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D4EDD] motion-reduce:transition-none"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
              <Chip tone="onInk" className="text-[0.65rem]">
                {markerStyle[selected.type].label}
              </Chip>
              <h4 className="mt-2 pr-6 text-base font-bold tracking-tight text-white">
                {selected.label}
              </h4>
              {selected.detail ? (
                <p className="mt-0.5 text-xs capitalize text-[#D8CFE3]/80">{selected.detail}</p>
              ) : null}
              <p className="mt-2 text-xs tabular-nums text-[#D8CFE3]/60">
                {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <StaggerGroup onMount stagger={0.05} className="flex flex-wrap gap-2">
        {(Object.keys(markerStyle) as MarkerType[]).map((type) => {
          const style = markerStyle[type];
          const Icon = style.icon;
          const count = markers.filter((marker) => marker.type === type).length;
          if (count === 0) return null;
          return (
            <StaggerItem
              as="div"
              size="sm"
              key={type}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", style.pin, style.text)}>
                <Icon className="h-2.5 w-2.5" />
              </span>
              {style.label} · {count}
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </div>
  );
}
