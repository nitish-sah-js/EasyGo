"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ACCOMMODATION_PREFERENCES,
  FOOD_PREFERENCES,
  INTEREST_CATEGORIES,
  TRANSPORT_MODES,
  TRAVEL_STYLES,
  tripPlanningSchema,
  type AccommodationPreference,
  type FoodPreference,
  type InterestCategory,
  type TransportMode,
  type TravelStyle,
  type TripPlanningInput,
} from "@nexttour/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AuthGuard } from "@/components/auth-guard";
import { apiFetch } from "@/lib/api";
import type { PlanTripResponse } from "@/types/trips";

const steps = ["Route", "Dates", "Travelers", "Budget", "Preferences", "Review"] as const;

const fieldsPerStep: ReadonlyArray<readonly (keyof TripPlanningInput)[]> = [
  ["origin", "destination"],
  ["departureDate", "returnDate"],
  ["travelers"],
  ["budget"],
  ["travelStyle", "foodPreference", "accommodationPreference", "preferredTransport", "interests"],
  [],
];

function OptionButton({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
        selected ? "border-cyan-600 bg-cyan-50 text-cyan-900" : "border-border bg-white text-slate-700 hover:bg-muted"
      }`}
    >
      {label.replace("_", " ")}
    </button>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const form = useForm<TripPlanningInput>({
    resolver: zodResolver(tripPlanningSchema),
    defaultValues: {
      origin: "Patna",
      destination: "Goa",
      departureDate: "2026-08-20",
      returnDate: "2026-08-25",
      travelers: 2,
      budget: 30000,
      travelStyle: "BUDGET",
      preferredTransport: ["FLIGHT", "TRAIN", "BUS"],
      interests: ["BEACH", "NATURE", "HISTORY"],
      foodPreference: "VEGETARIAN",
      accommodationPreference: "BUDGET",
    },
  });

  const values = form.watch();
  const [created, setCreated] = useState(false);
  const mutation = useMutation({
    mutationFn: (payload: TripPlanningInput) =>
      apiFetch<PlanTripResponse>("/api/trips/plan", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (result) => {
      setCreated(true);
      window.setTimeout(() => router.push(`/trips/${result.tripId}/planning`), 700);
    },
  });

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  async function goToNextStep() {
    const fields = fieldsPerStep[step] ?? [];
    const valid = fields.length === 0 ? true : await form.trigger(fields);
    if (valid) {
      setStep((value) => value + 1);
    }
  }

  function toggleTransport(mode: TransportMode) {
    const current = form.getValues("preferredTransport");
    const next = current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode];
    form.setValue("preferredTransport", next, { shouldDirty: true, shouldValidate: true });
  }

  function toggleInterest(interest: InterestCategory) {
    const current = form.getValues("interests");
    const next = current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest];
    form.setValue("interests", next, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <AuthGuard>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge>{steps[step]}</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">Plan a trip</h1>
        </div>
        <div className="w-full max-w-xs">
          <Progress value={progress} />
        </div>
      </div>

      <form onSubmit={form.handleSubmit((payload) => mutation.mutate(payload))}>
        <Card>
          <CardHeader>
            <CardTitle>{steps[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span>Origin</span>
                  <Input {...form.register("origin")} />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Destination</span>
                  <Input {...form.register("destination")} />
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span>Departure</span>
                  <Input type="date" {...form.register("departureDate")} />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Return</span>
                  <Input type="date" {...form.register("returnDate")} />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <label className="block max-w-xs space-y-2 text-sm font-medium">
                <span>Travelers</span>
                <Input type="number" min={1} max={12} {...form.register("travelers", { valueAsNumber: true })} />
              </label>
            ) : null}

            {step === 3 ? (
              <label className="block max-w-xs space-y-2 text-sm font-medium">
                <span>Budget</span>
                <Input type="number" min={5000} step={500} {...form.register("budget", { valueAsNumber: true })} />
              </label>
            ) : null}

            {step === 4 ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Transport</div>
                  <div className="flex flex-wrap gap-2">
                    {TRANSPORT_MODES.map((mode) => (
                      <OptionButton
                        key={mode}
                        label={mode}
                        selected={values.preferredTransport.includes(mode)}
                        onClick={() => toggleTransport(mode)}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Interests</div>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_CATEGORIES.map((interest) => (
                      <OptionButton
                        key={interest}
                        label={interest}
                        selected={values.interests.includes(interest)}
                        onClick={() => toggleInterest(interest)}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2 text-sm font-medium">
                    <span>Style</span>
                    <select className="h-11 w-full rounded-md border border-border bg-white px-3" {...form.register("travelStyle")}>
                      {TRAVEL_STYLES.map((style: TravelStyle) => (
                        <option key={style} value={style}>
                          {style.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Food</span>
                    <select className="h-11 w-full rounded-md border border-border bg-white px-3" {...form.register("foodPreference")}>
                      {FOOD_PREFERENCES.map((food: FoodPreference) => (
                        <option key={food} value={food}>
                          {food.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Accommodation</span>
                    <select
                      className="h-11 w-full rounded-md border border-border bg-white px-3"
                      {...form.register("accommodationPreference")}
                    >
                      {ACCOMMODATION_PREFERENCES.map((accommodation: AccommodationPreference) => (
                        <option key={accommodation} value={accommodation}>
                          {accommodation.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Route", `${values.origin} to ${values.destination}`],
                  ["Dates", `${values.departureDate} to ${values.returnDate}`],
                  ["Travelers", String(values.travelers)],
                  ["Budget", `INR ${values.budget.toLocaleString("en-IN")}`],
                  ["Style", values.travelStyle],
                  ["Food", values.foodPreference],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
                    <div className="mt-1 text-lg font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {Object.values(form.formState.errors)[0]?.message ? (
              <p className="text-sm text-rose-600">{Object.values(form.formState.errors)[0]?.message}</p>
            ) : null}
            {mutation.error ? <p className="text-sm text-rose-600">{mutation.error.message}</p> : null}
            {created ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Trip created! Taking you to planning…
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-border pt-5">
              <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={() => void goToNextStep()}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button disabled={mutation.isPending || created}>
                  <Check className="h-4 w-4" />
                  Plan My Trip
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
      </section>
    </AuthGuard>
  );
}
