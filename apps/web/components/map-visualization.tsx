import { Hotel, MapPin, Utensils } from "lucide-react";
import type { Attraction, Hotel as HotelType, Restaurant, TripResultPayload } from "@nexttour/shared";

type Marker = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  type: "origin" | "destination" | "hotel" | "attraction" | "restaurant";
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

function IconFor({ type }: { type: Marker["type"] }) {
  if (type === "hotel") {
    return <Hotel className="h-3.5 w-3.5" />;
  }
  if (type === "restaurant") {
    return <Utensils className="h-3.5 w-3.5" />;
  }
  return <MapPin className="h-3.5 w-3.5" />;
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
  const destinationLat = hotel?.latitude ?? attractions[0]?.latitude ?? 15.2993;
  const destinationLng = hotel?.longitude ?? attractions[0]?.longitude ?? 74.124;
  const markers: Marker[] = [
    {
      id: "destination",
      label: trip.destination,
      latitude: destinationLat,
      longitude: destinationLng,
      type: "destination",
    },
    ...(hotel
      ? [
          {
            id: hotel.id,
            label: hotel.name,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            type: "hotel" as const,
          },
        ]
      : []),
    ...attractions.slice(0, 6).map((attraction) => ({
      id: attraction.id,
      label: attraction.name,
      latitude: attraction.latitude,
      longitude: attraction.longitude,
      type: "attraction" as const,
    })),
    ...restaurants.slice(0, 3).map((restaurant) => ({
      id: restaurant.id,
      label: restaurant.name,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      type: "restaurant" as const,
    })),
  ];

  return (
    <div className="relative aspect-[16/10] min-h-[280px] overflow-hidden rounded-lg border border-border bg-[#e8f4ef]">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:36px_36px]" />
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
          stroke="#0891b2"
          strokeWidth="1.8"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-white bg-white px-2 py-1 text-xs font-medium shadow"
          style={markerPosition(marker, markers)}
          title={marker.label}
        >
          <IconFor type={marker.type} />
          <span className="max-w-[8rem] truncate">{marker.label}</span>
        </div>
      ))}
    </div>
  );
}
