import { Bus, Clock, IndianRupee, Plane, Train, Waypoints } from "lucide-react";
import { formatInr, formatMinutes, type RouteOption, type TransportMode } from "@nexttour/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modeIcon: Record<TransportMode, typeof Plane> = {
  FLIGHT: Plane,
  TRAIN: Train,
  BUS: Bus,
};

export function RouteCard({ route, recommended = false }: { route: RouteOption; recommended?: boolean }) {
  return (
    <Card className={recommended ? "border-cyan-400 bg-cyan-50/50" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Waypoints className="h-4 w-4 text-cyan-700" />
            {route.modes.join(" + ")}
          </CardTitle>
          <p className="mt-2 text-sm text-slate-600">{route.recommendationReason}</p>
        </div>
        <Badge>{recommended ? "Recommended" : route.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            <IndianRupee className="h-4 w-4 text-emerald-700" />
            {formatInr(route.totalPrice)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-cyan-700" />
            {formatMinutes(route.totalDurationMinutes)}
          </div>
          <div className="text-sm text-slate-600">{route.transferCount} transfers</div>
        </div>
        <div className="space-y-3">
          {route.segments.map((segment) => {
            const Icon = modeIcon[segment.mode];
            return (
              <div key={segment.id} className="rounded-md border border-border bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-cyan-700" />
                    {segment.operator} {segment.serviceNumber}
                  </div>
                  <div className="text-sm text-slate-600">{formatMinutes(segment.durationMinutes)}</div>
                </div>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div>
                    <div className="font-semibold">{segment.origin.code ?? segment.origin.city}</div>
                    <div className="text-slate-600">{new Date(segment.departureTime).toLocaleString()}</div>
                  </div>
                  <div className="hidden h-px w-16 bg-border sm:block" />
                  <div className="sm:text-right">
                    <div className="font-semibold">{segment.destination.code ?? segment.destination.city}</div>
                    <div className="text-slate-600">{new Date(segment.arrivalTime).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
