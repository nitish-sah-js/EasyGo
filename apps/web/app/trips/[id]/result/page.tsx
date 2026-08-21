"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Hotel, Loader2, MapPinned, Users } from "lucide-react";
import { formatInr } from "@nexttour/shared";
import { BudgetBreakdown } from "@/components/budget-breakdown";
import { ItineraryTimeline } from "@/components/itinerary-timeline";
import { MapVisualization } from "@/components/map-visualization";
import { RouteCard } from "@/components/route-card";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, statusLabel } from "@/lib/utils";
import { friendlyProviderMessage } from "@/lib/provider-messages";
import { getTripResult } from "@/services/trips";

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5 text-sm text-slate-600">{children}</CardContent>
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
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-8">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-700" />
            Loading result…
          </div>
        </section>
      </AuthGuard>
    );
  }

  if (error || !data) {
    return (
      <AuthGuard>
        <section className="mx-auto max-w-3xl px-4 py-8">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm text-rose-600">{error?.message ?? "Result is not ready."}</p>
              <Link href={`/trips/${params.id}/planning`}>
                <Button variant="secondary">Check planning</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge>{statusLabel(data.trip.status)}</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-normal">
              {data.trip.origin} to {data.trip.destination}
            </h1>
          </div>
          <Link href="/plan">
            <Button variant="secondary">Plan another trip</Button>
          </Link>
        </div>

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
            </section>
          ) : (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Recommended Route</h2>
              <Card>
                <CardContent className="pt-5 text-sm text-slate-600">
                  No route was found for this trip. The planning may have partially failed — try planning again.
                </CardContent>
              </Card>
            </section>
          )}

          {data.alternativeRoutes.length ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Alternative Routes</h2>
              <div className="grid gap-4">
                {data.alternativeRoutes.map((route) => (
                  <RouteCard key={route.id} route={route} />
                ))}
              </div>
            </section>
          ) : null}

          {data.itinerary ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Day-wise Itinerary</h2>
              <Card>
                <CardContent className="pt-5">
                  <div className="font-semibold">{data.itinerary.recommendation}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{data.itinerary.reason}</p>
                </CardContent>
              </Card>
              <ItineraryTimeline itinerary={data.itinerary} />
            </section>
          ) : (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Day-wise Itinerary</h2>
              <EmptyState>
                No itinerary was generated for this trip. Re-run planning to try again.
              </EmptyState>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {data.hotel ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Hotel Recommendation</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-cyan-700" />
                    {data.hotel.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div>
                    {data.hotel.reviewCount > 0
                      ? `${data.hotel.rating} rating · ${data.hotel.reviewCount} reviews`
                      : "Not yet rated"}
                  </div>
                  <div>
                    {formatInr(data.hotel.pricePerNight)}/night
                    {data.hotel.distanceFromCenterKm > 0
                      ? ` · ${data.hotel.distanceFromCenterKm} km from center`
                      : null}
                  </div>
                  {data.hotel.priceSource === "ESTIMATE" ? (
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      Estimated rate — no live quote was available for these dates.
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-700">Live rate for your dates</div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {data.hotel.amenities.map((amenity) => (
                      <Badge key={amenity}>{amenity}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Hotel Recommendation</h2>
              <EmptyState>No hotels were found for this destination and date range.</EmptyState>
            </section>
          )}

          {data.budget ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Budget Breakdown</h2>
              <Card>
                <CardContent className="pt-5">
                  <BudgetBreakdown budget={data.budget} />
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Tourist Attractions</h2>
            {data.attractions.length === 0 ? (
              <EmptyState>No attractions were found for this destination.</EmptyState>
            ) : (
            <Card>
              <CardContent className="space-y-3 pt-5">
                {data.attractions.slice(0, 6).map((attraction) => (
                  <div key={attraction.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{attraction.name}</div>
                      <div className="text-sm text-slate-600">{attraction.category} · {attraction.bestTimeToVisit}</div>
                    </div>
                    <div className="text-sm font-semibold">{formatInr(attraction.entryFee)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Restaurants</h2>
            {data.restaurants.length === 0 ? (
              <EmptyState>No restaurants were found for this destination.</EmptyState>
            ) : (
            <Card>
              <CardContent className="space-y-3 pt-5">
                {data.restaurants.slice(0, 5).map((restaurant) => (
                  <div key={restaurant.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{restaurant.name}</div>
                      <div className="text-sm text-slate-600">{restaurant.cuisine}</div>
                    </div>
                    <div className="text-sm font-semibold">{formatInr(restaurant.mealCostPerPerson)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Weather</h2>
            {data.weather.length === 0 ? (
              <EmptyState>
                No forecast is available for these dates — they fall outside the 16-day forecast window.
              </EmptyState>
            ) : (
            <Card>
              <CardContent className="grid gap-2 pt-5">
                {data.weather.map((weather) => (
                  <div key={weather.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
                    <span>{weather.date}</span>
                    <span>{weather.temperature}°C · {weather.condition.replace("_", " ")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Map</h2>
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
