import {
  Bus,
  Clock,
  CloudRain,
  CloudSun,
  Cloud,
  Hotel,
  IndianRupee,
  MapPin,
  Sun,
  Utensils,
  Coffee,
} from "lucide-react";
import {
  formatInr,
  formatMinutes,
  type GeneratedItinerary,
  type ItineraryActivity,
  type WeatherCondition,
} from "@nexttour/shared";
import { Chip } from "@/components/ui/chip";
import { IconTile, type IconTone } from "@/components/ui/icon-tile";

const categoryIcon: Record<ItineraryActivity["category"], typeof MapPin> = {
  TRANSPORT: Bus,
  HOTEL: Hotel,
  ATTRACTION: MapPin,
  RESTAURANT: Utensils,
  FREE_TIME: Coffee,
};

const categoryTone: Record<ItineraryActivity["category"], IconTone> = {
  TRANSPORT: "periwinkle",
  HOTEL: "sky",
  ATTRACTION: "orchid",
  RESTAURANT: "peach",
  FREE_TIME: "mint",
};

const weatherIcon: Record<WeatherCondition, typeof Sun> = {
  SUNNY: Sun,
  PARTLY_CLOUDY: CloudSun,
  CLOUDY: Cloud,
  LIGHT_RAIN: CloudRain,
  HEAVY_RAIN: CloudRain,
};

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/**
 * Chronological plan rendered as a rail: each day opens with a numbered marker,
 * and every activity hangs off the rail as its own card.
 */
export function ItineraryTimeline({ itinerary }: { itinerary: GeneratedItinerary }) {
  return (
    <div className="space-y-10">
      {itinerary.itinerary.map((day) => {
        const WeatherIcon = day.weather ? weatherIcon[day.weather.condition] : null;
        return (
          <section key={day.dayNumber} className="relative">
            <header className="flex flex-wrap items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lavender-600 to-periwinkle-700 text-sm font-bold text-white shadow-card">
                D{day.dayNumber}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {dayLabel(day.date)}
                </h3>
                {day.summary ? (
                  <p className="text-sm text-muted-foreground">{day.summary}</p>
                ) : null}
              </div>
              {day.weather && WeatherIcon ? (
                <Chip tone="sky">
                  <WeatherIcon className="h-3.5 w-3.5" />
                  {day.weather.temperature}°C · {day.weather.rainProbability}% rain
                </Chip>
              ) : null}
            </header>

            <div className="relative ml-6 mt-4 space-y-3 border-l-2 border-dashed border-lavender-200 pl-8">
              {day.activities.map((activity) => {
                const Icon = categoryIcon[activity.category];
                return (
                  <div key={activity.id} className="relative">
                    <span className="absolute -left-[2.4rem] top-6 h-3 w-3 rounded-full border-2 border-white bg-lavender-500 ring-1 ring-lavender-200" />
                    <article className="rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:shadow-lift">
                      <div className="flex items-start gap-3.5">
                        <IconTile tone={categoryTone[activity.category]}>
                          <Icon className="h-5 w-5" />
                        </IconTile>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-lavender-700">
                              <Clock className="h-3.5 w-3.5" />
                              {activity.time}
                            </span>
                            <Chip tone="neutral" className="text-[0.65rem]">
                              {activity.category.replace("_", " ").toLowerCase()}
                            </Chip>
                          </div>
                          <h4 className="mt-1 text-base font-bold tracking-tight text-foreground">
                            {activity.title}
                          </h4>
                          {activity.notes ? (
                            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                              {activity.notes}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                            {activity.locationName ? (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-orchid-600" />
                                {activity.locationName}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-sky-700" />
                              {formatMinutes(activity.durationMinutes)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <IndianRupee className="h-3.5 w-3.5 text-mint-800" />
                              {formatInr(activity.estimatedCost)}
                            </span>
                            {activity.travelTimeMinutes ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Bus className="h-3.5 w-3.5 text-periwinkle-600" />
                                {formatMinutes(activity.travelTimeMinutes)} travel
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
