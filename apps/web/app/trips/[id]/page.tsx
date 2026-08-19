"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Play, Route, Users, Wallet } from "lucide-react";
import { formatInr } from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <Badge>{statusLabel(trip?.status) ?? "Trip"}</Badge>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Route className="h-5 w-5 text-cyan-700" />
              {trip ? `${trip.origin} to ${trip.destination}` : "Loading trip…"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? <p className="text-sm text-slate-600">Loading trip…</p> : null}
            {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}

            {trip ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-md border border-border bg-slate-50 p-4 text-sm">
                    <CalendarDays className="h-5 w-5 text-cyan-700" />
                    {formatDate(trip.departureDate)} to {formatDate(trip.returnDate)}
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-border bg-slate-50 p-4 text-sm">
                    <Users className="h-5 w-5 text-cyan-700" />
                    {trip.travelers} travelers
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-border bg-slate-50 p-4 text-sm">
                    <Wallet className="h-5 w-5 text-cyan-700" />
                    {formatInr(trip.budget)} budget
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-border bg-slate-50 p-4 text-sm">
                    <MapPin className="h-5 w-5 text-cyan-700" />
                    {trip.preferences.accommodationPreference.replace("_", " ")} stay ·{" "}
                    {trip.preferences.foodPreference.replace("_", " ")} food
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {trip.status === "PENDING" || trip.status === "FAILED" ? (
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                      <Play className="h-4 w-4" />
                      {mutation.isPending ? "Starting…" : "Start planning"}
                    </Button>
                  ) : null}
                  <Link href={`/trips/${params.id}/planning`}>
                    <Button variant="secondary">Planning</Button>
                  </Link>
                  <Link href={`/trips/${params.id}/result`}>
                    <Button variant="secondary">Result</Button>
                  </Link>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </AuthGuard>
  );
}