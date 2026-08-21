import { ArrowRight, Bus, Clock, Plane, Repeat, Sparkles, Train } from "lucide-react";
import { formatInr, formatMinutes, type RouteOption, type TransportMode } from "@nexttour/shared";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { IconTile, type IconTone } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

const modeIcon: Record<TransportMode, typeof Plane> = {
  FLIGHT: Plane,
  TRAIN: Train,
  BUS: Bus,
};

const modeTone: Record<TransportMode, IconTone> = {
  FLIGHT: "mid",
  TRAIN: "base",
  BUS: "deep",
};

const labelTone: Record<RouteOption["label"], ChipTone> = {
  CHEAPEST: "success",
  FASTEST: "soft",
  BALANCED: "base",
  COMFORTABLE: "deep",
  ALTERNATIVE: "neutral",
};

function clockOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * A transport option rendered as a result row: mode tile and headline on the
 * left, fare on the right, then a rule and the leg-by-leg timings beneath.
 */
export function RouteCard({ route, recommended = false }: { route: RouteOption; recommended?: boolean }) {
  const primaryMode = route.modes[0] ?? "FLIGHT";
  const Icon = modeIcon[primaryMode];
  const first = route.segments[0];
  const last = route.segments[route.segments.length - 1];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface shadow-card transition hover:shadow-lift",
        recommended ? "border-brand-300 ring-1 ring-brand-200" : "border-border",
      )}
    >
      {recommended ? (
        <div className="flex items-center gap-2 bg-gradient-to-r from-brand-700 to-brand-700 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
          <Sparkles className="h-3.5 w-3.5" />
          Recommended route
        </div>
      ) : null}

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <IconTile tone={modeTone[primaryMode]} size="lg">
              <Icon className="h-6 w-6" />
            </IconTile>
            <div className="min-w-0 space-y-1.5">
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                {route.modes.join(" + ")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatMinutes(route.totalDurationMinutes)}
                {" · "}
                {route.transferCount === 0
                  ? "Direct"
                  : `${route.transferCount} transfer${route.transferCount > 1 ? "s" : ""}`}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <Chip tone={labelTone[route.label]} className="text-[0.7rem]">
                  {route.label.toLowerCase()}
                </Chip>
                {first && last ? (
                  <Chip tone="neutral" className="text-[0.7rem]">
                    {dayOf(first.departureTime)}
                  </Chip>
                ) : null}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {formatInr(route.totalPrice)}
            </div>
            <div className="text-xs text-muted-foreground">total for the route</div>
          </div>
        </div>

        {route.recommendationReason ? (
          <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-800">
            {route.recommendationReason}
          </p>
        ) : null}

        <div className="mt-5 space-y-3 border-t border-border pt-5">
          {route.segments.map((segment) => {
            const SegmentIcon = modeIcon[segment.mode];
            return (
              <div
                key={segment.id}
                className="grid gap-3 rounded-xl bg-brand-50/70 p-3.5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <IconTile tone={modeTone[segment.mode]} size="sm" className="bg-white">
                    <SegmentIcon className="h-4 w-4" />
                  </IconTile>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {segment.operator ?? segment.mode}
                      {segment.serviceNumber ? ` · ${segment.serviceNumber}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatMinutes(segment.durationMinutes)}
                      {segment.stops > 0 ? ` · ${segment.stops} stop${segment.stops > 1 ? "s" : ""}` : " · non-stop"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <TimePoint
                    time={clockOf(segment.departureTime)}
                    place={segment.origin.code ?? segment.origin.city ?? segment.origin.name}
                  />
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-400" />
                  <TimePoint
                    time={clockOf(segment.arrivalTime)}
                    place={segment.destination.code ?? segment.destination.city ?? segment.destination.name}
                    align="right"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {route.transferCount > 0 ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Repeat className="h-3.5 w-3.5" />
            Transfer time is already included in the {formatMinutes(route.totalDurationMinutes)} total.
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Times are shown in the local clock of each stop.
          </div>
        )}
      </div>
    </article>
  );
}

function TimePoint({
  time,
  place,
  align = "left",
}: {
  time: string;
  place: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <div className="text-sm font-bold tabular-nums text-foreground">{time}</div>
      <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">{place}</div>
    </div>
  );
}
