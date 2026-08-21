"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Plus,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { formatInr } from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PlaceImage } from "@/components/ui/place-image";
import { cityPhotoUrl } from "@/lib/place-images";
import { SectionHeading } from "@/components/ui/section-heading";
import { apiFetch } from "@/lib/api";
import { formatDate, statusLabel } from "@/lib/utils";
import { deleteTrip } from "@/services/trips";
import type { TripListItem } from "@/types/trips";

interface TripsResponse {
  trips: TripListItem[];
  total: number;
  limit: number;
  offset: number;
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["trips"],
    queryFn: () => apiFetch<TripsResponse>("/api/trips"),
  });

  const deleteMutation = useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  return (
    <AuthGuard>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Reveal onMount>
          <SectionHeading
            title="My Trips"
            subtitle={
              data ? `${data.total} ${data.total === 1 ? "journey" : "journeys"} planned` : "Manage your journeys"
            }
            action={
              <Link href="/plan">
                <Button shape="pill">
                  <Plus />
                  New trip
                </Button>
              </Link>
            }
          />
        </Reveal>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Card key={item} className="overflow-hidden">
                <div className="h-36 animate-pulse bg-brand-100" />
                <CardContent className="space-y-3 pt-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-brand-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-brand-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-blush-200 bg-blush-100 p-4 text-sm text-blush-900">
            {error.message}
          </p>
        ) : null}

        <StaggerGroup onMount stagger={0.07} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {data?.trips.map((trip) => (
              <StaggerItem
                key={trip.id}
                layout
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.22 } }}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                <Card className="group overflow-hidden transition-shadow hover:shadow-lift">
                  <PlaceImage
                    src={cityPhotoUrl(trip.destination, 400)}
                    alt={trip.destination}
                    seed={trip.destination}
                    scrim
                    className="h-36"
                  >
                    <div className="flex h-full flex-col justify-between p-4">
                      <Chip tone="onInk" className="self-start">
                        {statusLabel(trip.status)}
                      </Chip>
                      <div className="flex items-center gap-1.5 text-white">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <h3 className="truncate text-lg font-bold tracking-tight">
                          {trip.origin} → {trip.destination}
                        </h3>
                      </div>
                    </div>
                  </PlaceImage>

                  <CardContent className="space-y-4 pt-5">
                    <dl className="grid grid-cols-3 gap-3 text-xs">
                      <Meta icon={<CalendarDays className="h-3.5 w-3.5" />} label="Dates" value={formatDate(trip.departureDate)} />
                      <Meta icon={<Users className="h-3.5 w-3.5" />} label="Party" value={`${trip.travelers}`} />
                      <Meta icon={<Wallet className="h-3.5 w-3.5" />} label="Budget" value={formatInr(trip.budget)} />
                    </dl>

                    <div className="flex items-center gap-2 border-t border-border pt-4">
                      <Link href={`/trips/${trip.id}/result`} className="flex-1">
                        <Button block>
                          View plan
                          <ArrowRight />
                        </Button>
                      </Link>
                      <Link href={`/trips/${trip.id}`}>
                        <Button variant="secondary">Details</Button>
                      </Link>
                      <Button
                        aria-label={`Delete ${trip.origin} to ${trip.destination} trip`}
                        size="icon"
                        variant="ghost"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(trip.id)}
                        className="text-blush-600 hover:bg-blush-100 hover:text-blush-700"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </AnimatePresence>
        </StaggerGroup>

        {data?.trips.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <Compass className="h-7 w-7" />
              </span>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground">No trips yet</h3>
                <p className="text-sm text-muted-foreground">
                  Plan your first journey and it will show up here.
                </p>
              </div>
              <Link href="/plan">
                <Button size="lg" shape="pill">
                  <Plus />
                  Plan a trip
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-brand-700">{icon}</span>
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
