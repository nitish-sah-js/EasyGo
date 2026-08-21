"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, XCircle } from "lucide-react";
import type { PlanningStatus } from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { statusLabel } from "@/lib/utils";
<<<<<<< Updated upstream
import { friendlyProviderMessage } from "@/lib/provider-messages";
=======
import { cn } from "@/lib/utils";
>>>>>>> Stashed changes
import { getTripStatus, startTripPlanning } from "@/services/trips";

function isTerminal(status?: PlanningStatus) {
  return status === "COMPLETED" || status === "PARTIAL_SUCCESS" || status === "FAILED";
}

export default function PlanningPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ["trip-status", params.id],
    queryFn: () => getTripStatus(params.id),
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
        <PageHero
          eyebrow={<Chip tone="onInk">{statusLabel(data?.status)}</Chip>}
          title="Planning your journey"
          meta={`${doneCount} of ${totalCount} steps complete`}
          action={
            data && isTerminal(data.status) && data.status !== "FAILED" ? (
              <Link href={`/trips/${params.id}/result`}>
                <Button variant="onInk" shape="pill">
                  Your trip is ready
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null
          }
        />

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-lavender-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lavender-500 to-aqua-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <ol className="relative space-y-1 border-l-2 border-dashed border-lavender-200 pl-7">
              {data?.progress.map((step) => (
                <li key={step.key} className="relative py-2.5">
                  <span
                    className={cn(
                      "absolute -left-[2.3rem] top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm",
                      step.status === "COMPLETED" && "bg-mint-800 text-white",
                      step.status === "FAILED" && "bg-blush-600 text-white",
                      step.status === "PROCESSING" && "bg-lavender-600 text-white",
                      step.status === "PENDING" && "bg-lavender-100 text-lavender-400",
                    )}
                  >
                    {step.status === "COMPLETED" ? (
                      <Check className="h-4 w-4" />
                    ) : step.status === "FAILED" ? (
                      <XCircle className="h-4 w-4" />
                    ) : step.status === "PROCESSING" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        step.status === "PENDING" ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                    {step.status === "FAILED" ? (
                      <Chip tone="blush" className="text-[0.65rem]">
                        failed
                      </Chip>
                    ) : step.status === "PROCESSING" ? (
                      <Chip tone="lavender" className="text-[0.65rem]">
                        running
                      </Chip>
                    ) : null}
                  </div>
                </li>
              ))}
              {!data ? <li className="py-3 text-sm text-muted-foreground">Fetching status…</li> : null}
            </ol>

            {data?.providerNotes.length ? (
<<<<<<< Updated upstream
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Some options are temporarily unavailable. {data.providerNotes.map(friendlyProviderMessage).join(" ")}
=======
              <div className="mt-6 rounded-2xl border border-peach-200 bg-peach-100 p-4 text-sm text-peach-900">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Some options are temporarily unavailable
                </div>
                <p className="mt-1.5">{data.providerNotes.join("; ")}</p>
>>>>>>> Stashed changes
              </div>
            ) : null}

            {data?.error || error ? (
              <p className="mt-6 rounded-2xl border border-blush-200 bg-blush-100 p-4 text-sm text-blush-900">
                {data?.error ?? error?.message}
              </p>
            ) : null}

            {data?.status === "FAILED" ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
                  <RefreshCw className="h-4 w-4" />
                  {retryMutation.isPending ? "Retrying…" : "Retry planning"}
                </Button>
                <Link href={`/trips/${params.id}`}>
                  <Button variant="secondary">Trip details</Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </AuthGuard>
  );
}
