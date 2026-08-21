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
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconTile } from "@/components/ui/icon-tile";
import { PlaceImage } from "@/components/ui/place-image";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDate, statusLabel } from "@/lib/utils";
import { friendlyProviderMessage } from "@/lib/provider-messages";
import { firstPhotoUrl, photoCredit } from "@/lib/place-images";
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
            <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
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
                <Button size="lg" variant="default">
                  Check planning status
                </Button>
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
        <Reveal onMount>
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
                  <Button variant="onInkSolid" shape="pill">
                    <Plus />
                    Plan another
                  </Button>
                </Link>
              </>
            }
          />
        </Reveal>

        <StaggerGroup
          onMount
          delayChildren={0.15}
          stagger={0.07}
          className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4"
        >
          <StaggerItem size="sm">
            <StatTile
              tone="soft"
              icon={<CalendarDays className="h-5 w-5" />}
              label="Dates"
              value={`${formatDate(data.trip.departureDate)} – ${formatDate(data.trip.returnDate)}`}
              {...(nights > 0 ? { hint: `${nights} days forecast` } : {})}
            />
          </StaggerItem>
          <StaggerItem size="sm">
            <StatTile
              tone="base"
              icon={<Users className="h-5 w-5" />}
              label="Travelers"
              value={`${data.trip.travelers} ${data.trip.travelers === 1 ? "adult" : "adults"}`}
              hint={data.trip.preferences.travelStyle.replace("_", " ").toLowerCase() + " style"}
            />
          </StaggerItem>
          <StaggerItem size="sm">
            <StatTile
              tone="deep"
              icon={<MapPinned className="h-5 w-5" />}
              label="Interests"
              value={data.trip.preferences.interests.slice(0, 3).join(", ") || "Not set"}
            />
          </StaggerItem>
          <StaggerItem size="sm">
            <StatTile
              tone="mid"
              icon={<Wallet className="h-5 w-5" />}
              label="Budget"
              value={formatInr(data.trip.budget)}
              {...(data.budget
                ? { hint: `${Math.round(data.budget.budgetPercentageUsed)}% planned` }
                : {})}
            />
          </StaggerItem>
        </StaggerGroup>

        {data.providerMessages.length ? (
          <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-100 p-4 text-sm text-brand-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              This plan is partial
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-brand-900/90">
              {data.providerMessages.map((message) => (
                <li key={message}>{friendlyProviderMessage(message)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-10">
            <section>
              <Reveal>
                <SectionHeading title="Getting there" subtitle="Compared across flights, trains and buses." />
              </Reveal>
              {data.recommendedRoute ? (
                <StaggerGroup stagger={0.1} className="space-y-4">
                  <StaggerItem>
                    <RouteCard route={data.recommendedRoute} recommended />
                  </StaggerItem>
                  {data.alternativeRoutes.map((route) => (
                    <StaggerItem key={route.id}>
                      <RouteCard route={route} />
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              ) : (
                <EmptyState>
                  No route was found for this trip. The planning may have partially failed — try
                  planning again.
                </EmptyState>
              )}
            </section>

            <section>
              <Reveal>
                <SectionHeading
                  title="Day-by-day itinerary"
                  subtitle={data.itinerary?.recommendation ?? "Chronological view of your plan."}
                />
              </Reveal>
              {data.itinerary ? (
                <div className="space-y-6">
                  {data.itinerary.reason ? (
                    <Reveal>
                      <Card className="border-brand-200 bg-brand-50">
                        <CardContent className="pt-6 text-sm leading-6 text-brand-800">
                          {data.itinerary.reason}
                        </CardContent>
                      </Card>
                    </Reveal>
                  ) : null}
                  <ItineraryTimeline
                    itinerary={data.itinerary}
                    places={[...data.attractions, ...data.restaurants, ...(data.hotel ? [data.hotel] : [])]}
                  />
                </div>
              ) : (
                <EmptyState>
                  No itinerary was generated for this trip. Re-run planning to try again.
                </EmptyState>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <Reveal as="section">
              <SectionHeading title="Where you'll stay" className="mb-4" />
              {data.hotel ? (
                <Card className="group overflow-hidden">
                  <PlaceImage
                    src={firstPhotoUrl(data.hotel, 800)}
                    alt={data.hotel.name}
                    seed={data.hotel.name}
                    credit={photoCredit(data.hotel.photos?.[0])}
                    scrim
                    className="h-40"
                  >
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
                  </PlaceImage>
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
                      <Chip tone={data.hotel.priceSource === "LIVE" ? "success" : "neutral"}>
                        {data.hotel.priceSource === "LIVE" ? "Live rate" : "Estimated"}
                      </Chip>
                    </div>
                    {data.hotel.priceSource === "ESTIMATE" ? (
                      <p className="rounded-xl bg-brand-100 px-3 py-2 text-xs text-brand-900">
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
            </Reveal>

            {data.budget ? (
              <Reveal as="section">
                <SectionHeading title="Budget" className="mb-4" />
                <BudgetBreakdown budget={data.budget} />
              </Reveal>
            ) : null}

            <Reveal as="section">
              <SectionHeading title="Top attractions" className="mb-4" />
              {data.attractions.length === 0 ? (
                <EmptyState>No attractions were found for this destination.</EmptyState>
              ) : (
                <StaggerGroup stagger={0.05} className="space-y-2.5">
                  {data.attractions.slice(0, 6).map((attraction) => (
                    <StaggerItem
                      as="div"
                      size="sm"
                      key={attraction.id}
                      whileHover={{ y: -2 }}
                      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 shadow-card transition-shadow hover:shadow-lift"
                    >
                      <PlaceImage
                        src={firstPhotoUrl(attraction, 200)}
                        alt={attraction.name}
                        seed={attraction.name}
                        credit={photoCredit(attraction.photos?.[0])}
                        className="h-16 w-16 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-foreground">
                          {attraction.name}
                        </h4>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {attraction.rating > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                              <Star className="h-3 w-3" />
                              {attraction.rating}
                            </span>
                          ) : null}
                          <span className="capitalize">{attraction.category.toLowerCase()}</span>
                        </div>
                      </div>
                      <Chip tone={attraction.entryFee === 0 ? "success" : "neutral"} className="shrink-0">
                        {attraction.entryFee === 0 ? "Free" : formatInr(attraction.entryFee)}
                      </Chip>
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              )}
            </Reveal>

            <Reveal as="section">
              <SectionHeading title="Where to eat" className="mb-4" />
              {data.restaurants.length === 0 ? (
                <EmptyState>No restaurants were found for this destination.</EmptyState>
              ) : (
                <StaggerGroup stagger={0.05} className="space-y-2.5">
                  {data.restaurants.slice(0, 5).map((restaurant) => (
                    <StaggerItem
                      as="div"
                      size="sm"
                      key={restaurant.id}
                      whileHover={{ y: -2 }}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card transition-shadow hover:shadow-lift"
                    >
                      <IconTile tone="base">
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
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              )}
            </Reveal>

            <Reveal as="section">
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
                        className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 text-sm"
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
            </Reveal>

            <Reveal as="section">
              <SectionHeading title="On the map" className="mb-4" />
              <MapVisualization
                trip={data.trip}
                {...(data.hotel ? { hotel: data.hotel } : {})}
                attractions={data.attractions}
                restaurants={data.restaurants}
              />
            </Reveal>
          </aside>
        </div>
      </section>
    </AuthGuard>
  );
}
