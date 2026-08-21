"use client";

import { useState } from "react";
import { Hotel, MapPin, Navigation, Utensils, X } from "lucide-react";
import type { Attraction, Hotel as HotelType, Restaurant, TripResultPayload } from "@nexttour/shared";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

type MarkerType = "destination" | "hotel" | "attraction" | "restaurant";

type Marker = {
  id: string;
  label: string;
  detail?: string;
  latitude: number;
  longitude: number;
  type: MarkerType;
};

const markerStyle: Record<MarkerType, { pin: string; icon: typeof MapPin; label: string }> = {
  destination: { pin: "bg-brand-700", icon: Navigation, label: "Destination" },
  hotel: { pin: "bg-brand-700", icon: Hotel, label: "Stay" },
  attraction: { pin: "bg-brand-600", icon: MapPin, label: "Place" },
  restaurant: { pin: "bg-brand-700", icon: Utensils, label: "Food" },
};

function markerPosition(marker: Marker, markers: Marker[]) {
  const latitudes = markers.map((item) => item.latitude);
  const longitudes = markers.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const x = maxLng === minLng ? 50 : ((marker.longitude - minLng) / (maxLng - minLng)) * 78 + 11;
  const y = maxLat === minLat ? 50 : (1 - (marker.latitude - minLat) / (maxLat - minLat)) * 78 + 11;
  return { left: `${x}%`, top: `${y}%` };
}

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
      <div className="flex aspect-[16/11] min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-6 text-center text-sm text-muted-foreground">
        No mapped locations yet — the hotel and place providers returned no results for this trip.
      </div>
    );
  }

  const markers: Marker[] = [
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
      <div className="relative aspect-[16/11] min-h-[300px] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-100 via-brand-50 to-brand-200 shadow-card">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#90caf9_1px,transparent_1px),linear-gradient(90deg,#90caf9_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_70%,rgba(144,202,249,0.55),transparent_45%),radial-gradient(circle_at_75%_30%,rgba(144,202,249,0.45),transparent_45%)]" />

        <svg className="absolute inset-0 h-full w-full" role="presentation">
          <polyline
            points={markers
              .slice(0, 7)
              .map((marker) => {
                const position = markerPosition(marker, markers);
                return `${position.left.replace("%", "")},${position.top.replace("%", "")}`;
              })
              .join(" ")}
            fill="none"
            stroke="#2196f3"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {markers.map((marker) => {
          const style = markerStyle[marker.type];
          const Icon = style.icon;
          const active = marker.id === selectedId;
          return (
            <button
              key={marker.id}
              type="button"
              onClick={() => setSelectedId(active ? null : marker.id)}
              title={marker.label}
              aria-label={`${style.label}: ${marker.label}`}
              style={markerPosition(marker, markers)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 text-white shadow-lift ring-2 ring-white transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300",
                style.pin,
                active && "scale-110 ring-4",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        {selected ? (
          <div className="absolute bottom-4 left-1/2 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-surface p-4 shadow-panel">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelectedId(null)}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition hover:bg-brand-100 hover:text-brand-700"
            >
              <X className="h-4 w-4" />
            </button>
            <Chip tone="base" className="text-[0.65rem]">
              {markerStyle[selected.type].label}
            </Chip>
            <h4 className="mt-2 pr-6 text-base font-bold tracking-tight text-foreground">
              {selected.label}
            </h4>
            {selected.detail ? (
              <p className="mt-0.5 text-xs capitalize text-muted-foreground">{selected.detail}</p>
            ) : null}
            <p className="mt-2 text-xs tabular-nums text-muted-foreground">
              {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(markerStyle) as MarkerType[]).map((type) => {
          const style = markerStyle[type];
          const Icon = style.icon;
          const count = markers.filter((marker) => marker.type === type).length;
          if (count === 0) return null;
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-white", style.pin)}>
                <Icon className="h-2.5 w-2.5" />
              </span>
              {style.label} · {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
