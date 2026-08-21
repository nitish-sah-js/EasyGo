"use client";

import { useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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
  type Place,
  type WeatherCondition,
} from "@nexttour/shared";
import { Chip } from "@/components/ui/chip";
import { IconTile, type IconTone } from "@/components/ui/icon-tile";
import { PlaceImage } from "@/components/ui/place-image";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { firstPhotoUrl, photoCredit } from "@/lib/place-images";

const categoryIcon: Record<ItineraryActivity["category"], typeof MapPin> = {
  TRANSPORT: Bus,
  HOTEL: Hotel,
  ATTRACTION: MapPin,
  RESTAURANT: Utensils,
  FREE_TIME: Coffee,
};

const categoryTone: Record<ItineraryActivity["category"], IconTone> = {
  TRANSPORT: "mid",
  HOTEL: "soft",
  ATTRACTION: "deep",
  RESTAURANT: "base",
  FREE_TIME: "success",
};

const weatherIcon: Record<WeatherCondition, typeof Sun> = {
  SUNNY: Sun,
  PARTLY_CLOUDY: CloudSun,
  CLOUDY: Cloud,
  LIGHT_RAIN: CloudRain,
  HEAVY_RAIN: CloudRain,
};

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * The itinerary is generated as prose-with-fields: an activity names its venue in
 * `locationName` or `title`, but carries no id back to the attraction it came
 * from. Matching on the name is what's available, and it is done strictly —
 * exact match, or the venue name appearing whole inside the activity text — so a
 * near-miss shows no photo rather than the wrong landmark.
 *
 * Short names are skipped entirely: a three-letter place name matches too much.
 */
const MIN_MATCHABLE_NAME = 5;

function buildPhotoIndex(places: Place[]): Array<{ normalized: string; place: Place }> {
  return places
    .map((place) => ({ normalized: normalizeName(place.name), place }))
    .filter((entry) => entry.normalized.length >= MIN_MATCHABLE_NAME && entry.place.photos?.length)
    // Longest first, so "Gateway of India Museum" wins over "Gateway of India"
    // when an activity names both.
    .sort((left, right) => right.normalized.length - left.normalized.length);
}

function matchPlace(
  activity: ItineraryActivity,
  index: Array<{ normalized: string; place: Place }>,
): Place | undefined {
  const haystacks = [activity.locationName, activity.title]
    .filter((value): value is string => Boolean(value))
    .map(normalizeName);
  if (haystacks.length === 0) return undefined;

  return index.find((entry) =>
    haystacks.some((haystack) => haystack === entry.normalized || haystack.includes(entry.normalized)),
  )?.place;
}

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/**
 * Chronological plan rendered as a rail: each day opens with a numbered marker,
 * and every activity hangs off the rail as its own card.
 */
export function ItineraryTimeline({
  itinerary,
  places = [],
}: {
  itinerary: GeneratedItinerary;
  /** Attractions, restaurants and the hotel, so activities can show a real photo. */
  places?: Place[];
}) {
  const photoIndex = useMemo(() => buildPhotoIndex(places), [places]);

  return (
    <div className="space-y-10">
      {itinerary.itinerary.map((day) => (
        <DayCard key={day.dayNumber} day={day} photoIndex={photoIndex} />
      ))}
    </div>
  );
}

function DayCard({
  day,
  photoIndex,
}: {
  day: GeneratedItinerary["itinerary"][number];
  photoIndex: Array<{ normalized: string; place: Place }>;
}) {
  const WeatherIcon = day.weather ? weatherIcon[day.weather.condition] : null;
  const railRef = useRef<HTMLDivElement>(null);
  // The dashed rail "draws" downward as this day scrolls up through the
  // viewport — scaleY from a top origin reads as the line extending toward
  // each activity, mirroring how the route itself gets discovered leg by leg.
  const { scrollYProgress } = useScroll({ target: railRef, offset: ["start 0.8", "end 0.6"] });
  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="relative">
      <Reveal>
        <header className="flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-bold text-white shadow-card">
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
            <Chip tone="mid">
              <WeatherIcon className="h-3.5 w-3.5" />
              {day.weather.temperature}°C · {day.weather.rainProbability}% rain
            </Chip>
          ) : null}
        </header>
      </Reveal>

      <div ref={railRef} className="relative ml-6 mt-4 pl-8">
        <motion.div
          aria-hidden
          style={{ scaleY: railScale }}
          className="absolute bottom-0 left-0 top-0 w-0.5 origin-top border-l-2 border-dashed border-brand-200"
        />
        <StaggerGroup stagger={0.1} className="space-y-3">
          {day.activities.map((activity) => {
            const Icon = categoryIcon[activity.category];
            const place = matchPlace(activity, photoIndex);
            return (
              <StaggerItem key={activity.id} className="relative">
                <span className="absolute -left-[2.4rem] top-6 h-3 w-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                <article className="group rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                  <div className="flex items-start gap-3.5">
                    <IconTile tone={categoryTone[activity.category]}>
                      <Icon className="h-5 w-5" />
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
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
                            <MapPin className="h-3.5 w-3.5 text-brand-700" />
                            {activity.locationName}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-brand-700" />
                          {formatMinutes(activity.durationMinutes)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5 text-brand-800" />
                          {formatInr(activity.estimatedCost)}
                        </span>
                        {activity.travelTimeMinutes ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Bus className="h-3.5 w-3.5 text-brand-700" />
                            {formatMinutes(activity.travelTimeMinutes)} travel
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <PlaceImage
                      src={firstPhotoUrl(place, 400)}
                      alt={place?.name ?? activity.title}
                      seed={place?.name ?? activity.title}
                      credit={photoCredit(place?.photos?.[0])}
                      fallback="none"
                      className="hidden h-20 w-28 shrink-0 rounded-xl sm:block"
                    />
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
