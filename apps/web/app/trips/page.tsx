"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Plus, Trash2 } from "lucide-react";
import { formatInr } from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge>Trips</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-normal">Your trips</h1>
          </div>
          <Link href="/plan">
            <Button>
              <Plus className="h-4 w-4" />
              New trip
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <Card key={item}>
                <CardContent className="h-36 animate-pulse space-y-3 pt-5">
                  <div className="h-5 w-2/3 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
        {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {data?.trips.map((trip) => (
            <Card key={trip.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-700" />
                    {trip.origin} to {trip.destination}
                  </CardTitle>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(trip.departureDate)} to {formatDate(trip.returnDate)}
                  </div>
                </div>
                <Badge>{statusLabel(trip.status)}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  {trip.travelers} travelers · {formatInr(trip.budget)}
                </div>
                <div className="flex gap-2">
                  <Link href={`/trips/${trip.id}/planning`}>
                    <Button variant="secondary" size="sm">
                      Status
                    </Button>
                  </Link>
                  <Link href={`/trips/${trip.id}/result`}>
                    <Button size="sm">Result</Button>
                  </Link>
                  <Button
                    aria-label={`Delete ${trip.origin} to ${trip.destination} trip`}
                    size="icon"
                    variant="ghost"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(trip.id)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {data?.trips.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 pt-5">
              <p className="text-sm text-slate-600">No trips yet.</p>
              <Link href="/plan">
                <Button>
                  <Plus className="h-4 w-4" />
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