"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  Hotel,
  MapPin,
  Play,
  Salad,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { formatInr } from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { apiFetch } from "@/lib/api";
import { formatDate, statusLabel } from "@/lib/utils";
import { startTripPlanning } from "@/services/trips";
import type { TripResponse } from "@/types/trips";

export default function TripPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["trip", params.id],
    queryFn: () => apiFetch<TripResponse>(`/api/trips/${params.id}`),
  });
  const mutation = useMutation({
    mutationFn: () => startTripPlanning(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-status", params.id] });
    },
  });

  const trip = data?.trip;

  return (
    <AuthGuard>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          eyebrow={<Chip tone="onInk">{statusLabel(trip?.status) ?? "Trip"}</Chip>}
          title={trip ? `${trip.origin} to ${trip.destination}` : "Loading trip…"}
          {...(trip
            ? {
                meta: `${formatDate(trip.departureDate)} – ${formatDate(trip.returnDate)} · ${
                  trip.travelers
                } ${trip.travelers === 1 ? "traveler" : "travelers"}`,
              }
            : {})}
          action={
            trip && (trip.status === "PENDING" || trip.status === "FAILED") ? (
              <Button
                size="lg"
                variant="onInkSolid"
                shape="pill"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                <Play />
                {mutation.isPending ? "Starting…" : "Start planning"}
              </Button>
            ) : trip ? (
              <Link href={`/trips/${params.id}/result`}>
                <Button size="lg" variant="onInkSolid" shape="pill">
                  <Sparkles />
                  View plan
                </Button>
              </Link>
            ) : null
          }
        />

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading trip…</p>
        ) : null}
        {error ? (
          <p className="mt-6 flex items-center gap-2 rounded-2xl border border-blush-200 bg-blush-100 p-4 text-sm text-blush-900">
            <AlertTriangle className="h-4 w-4" />
            {error.message}
          </p>
        ) : null}

        {trip ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <StatTile
                    tone="soft"
                    icon={<CalendarDays className="h-5 w-5" />}
                    label="Dates"
                    value={`${formatDate(trip.departureDate)} – ${formatDate(trip.returnDate)}`}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <StatTile
                    tone="base"
                    icon={<Users className="h-5 w-5" />}
                    label="Travelers"
                    value={`${trip.travelers} ${trip.travelers === 1 ? "traveler" : "travelers"}`}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <StatTile
                    tone="mid"
                    icon={<Wallet className="h-5 w-5" />}
                    label="Budget"
                    value={formatInr(trip.budget)}
                    hint={`${trip.preferences.travelStyle.replace("_", " ").toLowerCase()} style`}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <StatTile
                    tone="mid"
                    icon={<Hotel className="h-5 w-5" />}
                    label="Stay"
                    value={trip.preferences.accommodationPreference.replace("_", " ").toLowerCase()}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <SectionHeading title="Your preferences" className="mb-4" />
              <Card>
                <CardContent className="space-y-5 pt-6">
                  <PreferenceRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Interests"
                    values={trip.preferences.interests}
                  />
                  <PreferenceRow
                    icon={<Play className="h-4 w-4" />}
                    label="Transport"
                    values={trip.preferences.preferredTransport}
                  />
                  <PreferenceRow
                    icon={<Salad className="h-4 w-4" />}
                    label="Food"
                    values={[trip.preferences.foodPreference]}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={`/trips/${params.id}/planning`}>
                <Button variant="secondary">Planning status</Button>
              </Link>
              <Link href={`/trips/${params.id}/result`}>
                <Button variant="secondary">Full result</Button>
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function PreferenceRow({
  icon,
  label,
  values,
}: {
  icon: React.ReactNode;
  label: string;
  values: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="flex min-w-[7.5rem] items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span className="text-brand-700">{icon}</span>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Chip key={value} tone="base">
            {value.replace("_", " ").toLowerCase()}
          </Chip>
        ))}
      </div>
    </div>
  );
}
