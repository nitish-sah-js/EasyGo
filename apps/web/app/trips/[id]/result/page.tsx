"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  MapPinned,
  Plus,
  Star,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import { formatInr } from "@nexttour/shared";
import { BudgetBreakdown } from "@/components/budget-breakdown";
import { ItineraryTimeline } from "@/components/itinerary-timeline";
import { MapVisualization } from "@/components/map-visualization";
import { RouteCard } from "@/components/route-card";
import { AuthGuard } from "@/components/auth-guard";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconTile } from "@/components/ui/icon-tile";
import { Scenic } from "@/components/ui/scenic";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDate, statusLabel } from "@/lib/utils";
import { friendlyProviderMessage } from "@/lib/provider-messages";
import { getTripResult } from "@/services/trips";

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export default function TripResultPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["trip-result", params.id],
    queryFn: () => getTripResult(params.id),
  });

  if (isLoading) {
    return (
      <AuthGuard>
        <section className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4 py-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-lavender-500" />
            Loading your trip…
          </div>
        </section>
      </AuthGuard>
    );
  }

  if (error || !data) {
    return (
      <AuthGuard>
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2 text-blush-700">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-semibold">{error?.message ?? "Result is not ready."}</p>
              </div>
              <Link href={`/trips/${params.id}/planning`}>
                <Button variant="secondary">Check planning status</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </AuthGuard>
    );
  }

  const nights = data.weather.length;

  return (
    <AuthGuard>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          eyebrow={<Chip tone="onInk">{statusLabel(data.trip.status)}</Chip>}
          title={`${data.trip.origin} to ${data.trip.destination}`}
          meta={`${formatDate(data.trip.departureDate)} – ${formatDate(data.trip.returnDate)} · ${
            data.trip.travelers
          } ${data.trip.travelers === 1 ? "traveler" : "travelers"} · ${formatInr(data.trip.budget)} budget`}
          action={
            <>
              <Link href={`/trips/${params.id}/planning`}>
                <Button variant="onInk" shape="pill">
                  Planning log
                </Button>
              </Link>
              <Link href="/plan">
                <Button variant="onInk" shape="pill">
                  <Plus className="h-4 w-4" />
                  Plan another
                </Button>
              </Link>
            </>
          }
        />

        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            tone="periwinkle"
            icon={<CalendarDays className="h-5 w-5" />}
            label="Dates"
            value={`${formatDate(data.trip.departureDate)} – ${formatDate(data.trip.returnDate)}`}
            {...(nights > 0 ? { hint: `${nights} days forecast` } : {})}
          />
          <StatTile
            tone="lavender"
            icon={<Users className="h-5 w-5" />}
            label="Travelers"
            value={`${data.trip.travelers} ${data.trip.travelers === 1 ? "adult" : "adults"}`}
            hint={data.trip.preferences.travelStyle.replace("_", " ").toLowerCase() + " style"}
          />
          <StatTile
            tone="orchid"
            icon={<MapPinned className="h-5 w-5" />}
            label="Interests"
            value={data.trip.preferences.interests.slice(0, 3).join(", ") || "Not set"}
          />
          <StatTile
            tone="mint"
            icon={<Wallet className="h-5 w-5" />}
            label="Budget"
            value={formatInr(data.trip.budget)}
            {...(data.budget
              ? { hint: `${Math.round(data.budget.budgetPercentageUsed)}% planned` }
              : {})}
          />
        </div>

        {data.providerMessages.length ? (
          <div className="mt-4 rounded-2xl border border-peach-200 bg-peach-100 p-4 text-sm text-peach-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              This plan is partial
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-peach-900/90">
              {data.providerMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

<<<<<<< Updated upstream
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-5">
              <CalendarDays className="h-5 w-5 text-cyan-700" />
              <div className="text-sm">
                {formatDate(data.trip.departureDate)} to {formatDate(data.trip.returnDate)}
              </div>
            </CardContent>
          </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Users className="h-5 w-5 text-cyan-700" />
            <div className="text-sm">{data.trip.travelers} travelers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <MapPinned className="h-5 w-5 text-cyan-700" />
            <div className="text-sm">{data.trip.preferences.interests.join(", ")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-sm font-semibold">{formatInr(data.trip.budget)} budget</CardContent>
        </Card>
      </div>

      {data.providerMessages.length ? (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-medium">This plan is partial.</div>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {data.providerMessages.map((message) => (
              <li key={message}>{friendlyProviderMessage(message)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {data.recommendedRoute ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Recommended Route</h2>
              <RouteCard route={data.recommendedRoute} recommended />
=======
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-10">
            <section>
              <SectionHeading title="Getting there" subtitle="Compared across flights, trains and buses." />
              {data.recommendedRoute ? (
                <div className="space-y-4">
                  <RouteCard route={data.recommendedRoute} recommended />
                  {data.alternativeRoutes.map((route) => (
                    <RouteCard key={route.id} route={route} />
                  ))}
                </div>
              ) : (
                <EmptyState>
                  No route was found for this trip. The planning may have partially failed — try
                  planning again.
                </EmptyState>
              )}
>>>>>>> Stashed changes
            </section>

            <section>
              <SectionHeading
                title="Day-by-day itinerary"
                subtitle={data.itinerary?.recommendation ?? "Chronological view of your plan."}
              />
              {data.itinerary ? (
                <div className="space-y-6">
                  {data.itinerary.reason ? (
                    <Card className="border-lavender-200 bg-lavender-50">
                      <CardContent className="pt-6 text-sm leading-6 text-lavender-800">
                        {data.itinerary.reason}
                      </CardContent>
                    </Card>
                  ) : null}
                  <ItineraryTimeline itinerary={data.itinerary} />
                </div>
              ) : (
                <EmptyState>
                  No itinerary was generated for this trip. Re-run planning to try again.
                </EmptyState>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <section>
              <SectionHeading title="Where you'll stay" className="mb-4" />
              {data.hotel ? (
                <Card className="overflow-hidden">
                  <Scenic seed={data.hotel.name} scrim className="h-40">
                    <div className="flex h-full items-end justify-between gap-3 p-4">
                      <h3 className="text-lg font-bold leading-tight tracking-tight text-white">
                        {data.hotel.name}
                      </h3>
                      {data.hotel.reviewCount > 0 ? (
                        <Chip tone="onInk" className="shrink-0">
                          <Star className="h-3.5 w-3.5" />
                          {data.hotel.rating}
                        </Chip>
                      ) : null}
                    </div>
                  </Scenic>
                  <CardContent className="space-y-4 pt-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                          {formatInr(data.hotel.pricePerNight)}
                          <span className="text-sm font-medium text-muted-foreground">/night</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {data.hotel.reviewCount > 0
                            ? `${data.hotel.reviewCount} reviews`
                            : "Not yet rated"}
                          {data.hotel.distanceFromCenterKm > 0
                            ? ` · ${data.hotel.distanceFromCenterKm} km from center`
                            : ""}
                        </p>
                      </div>
                      <Chip tone={data.hotel.priceSource === "LIVE" ? "mint" : "peach"}>
                        {data.hotel.priceSource === "LIVE" ? "Live rate" : "Estimated"}
                      </Chip>
                    </div>
                    {data.hotel.priceSource === "ESTIMATE" ? (
                      <p className="rounded-xl bg-peach-100 px-3 py-2 text-xs text-peach-900">
                        No live quote was available for these dates — this rate comes from the
                        property&apos;s price tier.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {data.hotel.amenities.slice(0, 8).map((amenity) => (
                        <Chip key={amenity} tone="neutral" className="text-[0.7rem]">
                          {amenity}
                        </Chip>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState>No hotels were found for this destination and date range.</EmptyState>
              )}
            </section>

            {data.budget ? (
              <section>
                <SectionHeading title="Budget" className="mb-4" />
                <BudgetBreakdown budget={data.budget} />
              </section>
            ) : null}

            <section>
              <SectionHeading title="Top attractions" className="mb-4" />
              {data.attractions.length === 0 ? (
                <EmptyState>No attractions were found for this destination.</EmptyState>
              ) : (
                <div className="space-y-2.5">
                  {data.attractions.slice(0, 6).map((attraction) => (
                    <div
                      key={attraction.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 shadow-card transition hover:shadow-lift"
                    >
                      <Scenic seed={attraction.name} className="h-16 w-16 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-foreground">
                          {attraction.name}
                        </h4>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {attraction.rating > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-lavender-700">
                              <Star className="h-3 w-3" />
                              {attraction.rating}
                            </span>
                          ) : null}
                          <span className="capitalize">{attraction.category.toLowerCase()}</span>
                        </div>
                      </div>
                      <Chip tone={attraction.entryFee === 0 ? "mint" : "neutral"} className="shrink-0">
                        {attraction.entryFee === 0 ? "Free" : formatInr(attraction.entryFee)}
                      </Chip>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeading title="Where to eat" className="mb-4" />
              {data.restaurants.length === 0 ? (
                <EmptyState>No restaurants were found for this destination.</EmptyState>
              ) : (
                <div className="space-y-2.5">
                  {data.restaurants.slice(0, 5).map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card"
                    >
                      <IconTile tone="peach">
                        <Utensils className="h-5 w-5" />
                      </IconTile>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-foreground">
                          {restaurant.name}
                        </h4>
                        <p className="truncate text-xs text-muted-foreground">{restaurant.cuisine}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-foreground">
                        {formatInr(restaurant.mealCostPerPerson)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeading title="Forecast" className="mb-4" />
              {data.weather.length === 0 ? (
                <EmptyState>
                  No forecast is available for these dates — they fall outside the 16-day window.
                </EmptyState>
              ) : (
                <Card>
                  <CardContent className="grid gap-1.5 pt-6">
                    {data.weather.map((weather) => (
                      <div
                        key={weather.id}
                        className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2.5 text-sm"
                      >
                        <span className="text-muted-foreground">{weather.date}</span>
                        <span className="font-semibold capitalize text-foreground">
                          {weather.temperature}°C · {weather.condition.replace("_", " ").toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>

            <section>
              <SectionHeading title="On the map" className="mb-4" />
              <MapVisualization
                trip={data.trip}
                {...(data.hotel ? { hotel: data.hotel } : {})}
                attractions={data.attractions}
                restaurants={data.restaurants}
              />
            </section>
          </aside>
        </div>
      </section>
    </AuthGuard>
  );
}
