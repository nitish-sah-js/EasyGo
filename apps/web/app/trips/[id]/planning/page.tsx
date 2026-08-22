"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, XCircle } from "lucide-react";
import type { PlanningStatus } from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { statusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { friendlyProviderMessage } from "@/lib/provider-messages";
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

  const status = data?.status;
  useEffect(() => {
    if (status === "COMPLETED" || status === "PARTIAL_SUCCESS") {
      router.prefetch(`/trips/${params.id}/result`);
    }
  }, [status, params.id, router]);

  return (
    <AuthGuard>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Reveal onMount>
          <PageHero
            eyebrow={<Chip tone="onInk">{statusLabel(data?.status)}</Chip>}
            title="Planning your journey"
            meta={`${doneCount} of ${totalCount} steps complete`}
            action={
              <AnimatePresence>
                {data && isTerminal(data.status) && data.status !== "FAILED" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  >
                    <Link href={`/trips/${params.id}/result`}>
                      <Button size="lg" variant="onInkSolid" shape="pill">
                        Your trip is ready
                        <ArrowRight />
                      </Button>
                    </Link>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            }
          />
        </Reveal>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <StaggerGroup as="ol" onMount stagger={0.06} className="relative space-y-1 border-l-2 border-dashed border-brand-200 pl-7">
              {data?.progress.map((step) => (
                <StaggerItem as="li" size="sm" key={step.key} className="relative py-2.5">
                  <span
                    className={cn(
                      "absolute -left-[2.3rem] top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm transition-colors duration-300",
                      step.status === "COMPLETED" && "bg-mint-800 text-white",
                      step.status === "FAILED" && "bg-blush-600 text-white",
                      step.status === "PROCESSING" && "bg-brand-700 text-white",
                      step.status === "PENDING" && "bg-brand-100 text-brand-400",
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={step.status}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-center justify-center"
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
                      </motion.span>
                    </AnimatePresence>
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
                      <Chip tone="danger" className="text-[0.65rem]">
                        failed
                      </Chip>
                    ) : step.status === "PROCESSING" ? (
                      <Chip tone="base" className="text-[0.65rem]">
                        running
                      </Chip>
                    ) : null}
                  </div>
                </StaggerItem>
              ))}
              {!data ? <li className="py-3 text-sm text-muted-foreground">Fetching status…</li> : null}
            </StaggerGroup>

            <AnimatePresence initial={false}>
              {data?.providerNotes.length ? (
                <motion.div
                  key="provider-notes"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden rounded-2xl border border-brand-200 bg-brand-100 p-4 text-sm text-brand-900"
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Some options are temporarily unavailable
                  </div>
                  <p className="mt-1.5">{data.providerNotes.map(friendlyProviderMessage).join(" ")}</p>
                </motion.div>
              ) : null}

              {data?.error || error ? (
                <motion.p
                  key="planning-error"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden rounded-2xl border border-blush-200 bg-blush-100 p-4 text-sm text-blush-900"
                >
                  {data?.error ?? error?.message}
                </motion.p>
              ) : null}
            </AnimatePresence>

            {data?.status === "FAILED" ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => retryMutation.mutate()}
                  disabled={retryMutation.isPending}
                >
                  <RefreshCw />
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
