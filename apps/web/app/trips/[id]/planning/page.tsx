"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, XCircle } from "lucide-react";
import type { PlanningStatus } from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api";
import { statusLabel } from "@/lib/utils";
import { startTripPlanning } from "@/services/trips";
import type { TripStatusResponse } from "@/types/trips";

function isTerminal(status?: PlanningStatus) {
  return status === "COMPLETED" || status === "PARTIAL_SUCCESS" || status === "FAILED";
}

export default function PlanningPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ["trip-status", params.id],
    queryFn: () => apiFetch<TripStatusResponse>(`/api/trips/${params.id}/status`),
    refetchInterval: (query) => (isTerminal(query.state.data?.status) ? false : 2_000),
  });

  const retryMutation = useMutation({
    mutationFn: () => startTripPlanning(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-status", params.id] });
    },
  });

  const doneCount = data?.progress.filter((step) => step.status === "COMPLETED").length ?? 0;
  const totalCount = data?.progress.length ?? 10;
  const progress = (doneCount / totalCount) * 100;

  if (data?.status === "COMPLETED" || data?.status === "PARTIAL_SUCCESS") {
    window.setTimeout(() => router.prefetch(`/trips/${params.id}/result`), 0);
  }

  return (
    <AuthGuard>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Badge>{statusLabel(data?.status)}</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">Planning your journey...</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Progress value={progress} />
            <div className="space-y-3">
              {data?.progress.map((step) => (
                <div key={step.key} className="flex items-center gap-3 rounded-md border border-border bg-white p-3">
                  {step.status === "COMPLETED" ? (
                    <Check className="h-5 w-5 text-emerald-600" />
                  ) : step.status === "FAILED" ? (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-700" />
                  )}
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              ))}
            </div>

            {data?.providerNotes.length ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Some options are temporarily unavailable. {data.providerNotes.join("; ")}
              </div>
            ) : null}
            {data?.error || error ? <p className="text-sm text-rose-600">{data?.error ?? error?.message}</p> : null}

            {data?.status === "FAILED" ? (
              <div className="flex items-center gap-3">
                <Button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
                  <RefreshCw className="h-4 w-4" />
                  {retryMutation.isPending ? "Retrying…" : "Retry planning"}
                </Button>
                <Link href={`/trips/${params.id}`}>
                  <Button variant="secondary">Trip details</Button>
                </Link>
              </div>
            ) : null}

            {data && isTerminal(data.status) && data.status !== "FAILED" ? (
              <Link href={`/trips/${params.id}/result`}>
                <Button>Trip Ready</Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </AuthGuard>
  );
}