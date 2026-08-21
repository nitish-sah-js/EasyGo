"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  CalendarDays,
  Check,
  MapPin,
  Plane,
  Salad,
  Train,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ACCOMMODATION_PREFERENCES,
  FOOD_PREFERENCES,
  INTEREST_CATEGORIES,
  TRANSPORT_MODES,
  TRAVEL_STYLES,
  addDays,
  tripPlanningSchema,
  type AccommodationPreference,
  type FoodPreference,
  type InterestCategory,
  type TransportMode,
  type TravelStyle,
  type TripPlanningInput,
} from "@nexttour/shared";
import { AuthGuard } from "@/components/auth-guard";
import { PlaceAutocompleteInput } from "@/components/place-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconTile } from "@/components/ui/icon-tile";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { PlanTripResponse } from "@/types/trips";

const steps = [
  { label: "Route", icon: MapPin },
  { label: "Dates", icon: CalendarDays },
  { label: "Travelers", icon: Users },
  { label: "Budget", icon: Wallet },
  { label: "Preferences", icon: Salad },
  { label: "Review", icon: Check },
] as const;

const fieldsPerStep: ReadonlyArray<readonly (keyof TripPlanningInput)[]> = [
  ["origin", "destination"],
  ["departureDate", "returnDate"],
  ["travelers"],
  ["budget"],
  ["travelStyle", "foodPreference", "accommodationPreference", "preferredTransport", "interests"],
  [],
];

const transportIcon: Record<TransportMode, typeof Plane> = {
  FLIGHT: Plane,
  TRAIN: Train,
  BUS: Bus,
};

/** Matches `Input` so the autocomplete field is visually identical to the plain ones. */
const planInputClass =
  "h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

function OptionButton({
  selected,
  label,
  icon,
  onClick,
}: {
  selected: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-12 items-center gap-2 rounded-[14px] border px-5 text-[0.9375rem] font-semibold capitalize",
        "transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "[&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem] [&_svg]:shrink-0",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        selected
          ? "border-brand-400 bg-brand-100 text-brand-800 shadow-sm ring-1 ring-brand-200"
          : "border-border bg-surface text-muted-foreground hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
      )}
    >
      {icon}
      {label.replace("_", " ").toLowerCase()}
    </button>
  );
}

function PlanWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState(0);

  const defaults = useMemo<TripPlanningInput>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const departureDate = search.get("departureDate") ?? addDays(today, 14);
    const transport = search.get("transport") as TransportMode | null;
    const travelers = Number(search.get("travelers"));
    return {
      origin: search.get("origin") ?? "Patna",
      destination: search.get("destination") ?? "Goa",
      departureDate,
      returnDate: addDays(departureDate, 5),
      travelers: Number.isFinite(travelers) && travelers > 0 ? travelers : 2,
      budget: 30000,
      travelStyle: "BALANCED",
      preferredTransport:
        transport && TRANSPORT_MODES.includes(transport) ? [transport] : [...TRANSPORT_MODES],
      interests: ["BEACH", "NATURE", "HISTORY"],
      foodPreference: "VEGETARIAN",
      accommodationPreference: "MID_RANGE",
    };
  }, [search]);

  const form = useForm<TripPlanningInput>({
    resolver: zodResolver(tripPlanningSchema),
    defaultValues: defaults,
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

  async function goToNextStep() {
    const fields = fieldsPerStep[step] ?? [];
    const valid = fields.length === 0 ? true : await form.trigger(fields);
    if (valid) setStep((value) => value + 1);
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

  const StepIcon = steps[step]!.icon;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-1.5">
        <Chip tone="base">
          Step {step + 1} of {steps.length}
        </Chip>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Plan your trip
        </h1>
        <p className="text-sm text-muted-foreground">
          Six quick answers, then every provider is searched in one pass.
        </p>
      </div>

      {/* Step rail — mirrors the reference's connected step indicator. */}
      <ol className="relative mb-8 flex items-start justify-between gap-1">
        <li
          aria-hidden
          className="pointer-events-none absolute left-5 right-5 top-5 h-0.5 rounded-full bg-brand-100"
        />
        <li
          aria-hidden
          className="pointer-events-none absolute left-5 top-5 h-0.5 rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `calc((100% - 2.5rem) * ${step / (steps.length - 1)})` }}
        />
        {steps.map((item, index) => {
          const Icon = item.icon;
          const done = index < step;
          const active = index === step;
          return (
            <li key={item.label} className="relative flex flex-1 flex-col items-center gap-2">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 border-white transition",
                  done && "bg-brand-700 text-white shadow-card",
                  active && "bg-brand-700 text-white shadow-card ring-4 ring-brand-100",
                  !done && !active && "bg-brand-100 text-brand-400",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:block",
                  active ? "text-brand-700" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>

      <form onSubmit={form.handleSubmit((payload) => mutation.mutate(payload))}>
        <Card>
          <CardContent className="space-y-7 pt-7">
            <div className="flex items-center gap-3.5 border-b border-border pb-5">
              <IconTile tone="base" size="lg">
                <StepIcon className="h-6 w-6" />
              </IconTile>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {steps[step]!.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {
                    [
                      "Where are you starting from, and where to?",
                      "When do you leave and come back?",
                      "How many people are travelling?",
                      "What is the all-in budget for the trip?",
                      "Tell us how you like to travel.",
                      "Check everything over before we search.",
                    ][step]
                  }
                </p>
              </div>
            </div>

            {step === 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Origin" hint="Cities the providers can resolve">
                  <PlaceAutocompleteInput
                    value={values.origin ?? ""}
                    onChange={(next) =>
                      form.setValue("origin", next, { shouldDirty: true, shouldValidate: true })
                    }
                    onSelect={() => undefined}
                    ariaLabel="Origin"
                    className={planInputClass}
                  />
                </Field>
                <Field label="Destination">
                  <PlaceAutocompleteInput
                    value={values.destination ?? ""}
                    onChange={(next) =>
                      form.setValue("destination", next, { shouldDirty: true, shouldValidate: true })
                    }
                    onSelect={() => undefined}
                    ariaLabel="Destination"
                    className={planInputClass}
                  />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Departure">
                  <Input type="date" {...form.register("departureDate")} />
                </Field>
                <Field label="Return">
                  <Input type="date" {...form.register("returnDate")} />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <Field label="Travelers" className="max-w-xs" hint="Between 1 and 12">
                <Input type="number" min={1} max={12} {...form.register("travelers", { valueAsNumber: true })} />
              </Field>
            ) : null}

            {step === 3 ? (
              <Field label="Total budget (INR)" className="max-w-xs" hint="Covers transport, stay, food and activities">
                <Input type="number" min={5000} step={500} {...form.register("budget", { valueAsNumber: true })} />
              </Field>
            ) : null}

            {step === 4 ? (
              <div className="space-y-7">
                <div className="space-y-3">
                  <div className="field-label">Transport</div>
                  <div className="flex flex-wrap gap-2">
                    {TRANSPORT_MODES.map((mode) => {
                      const Icon = transportIcon[mode];
                      return (
                        <OptionButton
                          key={mode}
                          label={mode}
                          icon={<Icon className="h-4 w-4" />}
                          selected={values.preferredTransport.includes(mode)}
                          onClick={() => toggleTransport(mode)}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="field-label">Interests</div>
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
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Style">
                    <Select {...form.register("travelStyle")}>
                      {TRAVEL_STYLES.map((style: TravelStyle) => (
                        <option key={style} value={style}>
                          {style.replace("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Food">
                    <Select {...form.register("foodPreference")}>
                      {FOOD_PREFERENCES.map((food: FoodPreference) => (
                        <option key={food} value={food}>
                          {food.replace("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Accommodation">
                    <Select {...form.register("accommodationPreference")}>
                      {ACCOMMODATION_PREFERENCES.map((accommodation: AccommodationPreference) => (
                        <option key={accommodation} value={accommodation}>
                          {accommodation.replace("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["Route", `${values.origin} → ${values.destination}`],
                    ["Dates", `${values.departureDate} → ${values.returnDate}`],
                    ["Travelers", String(values.travelers)],
                    ["Budget", `INR ${values.budget.toLocaleString("en-IN")}`],
                    ["Style", values.travelStyle],
                    ["Food", values.foodPreference],
                    ["Transport", values.preferredTransport.join(", ")],
                    ["Interests", values.interests.join(", ")],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <div className="field-label text-brand-700">{label}</div>
                    <div className="mt-1 text-base font-semibold capitalize text-foreground">
                      {value.toString().toLowerCase()}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {Object.values(form.formState.errors)[0]?.message ? (
              <p className="rounded-xl border border-blush-200 bg-blush-100 px-4 py-3 text-sm text-blush-900">
                {Object.values(form.formState.errors)[0]?.message}
              </p>
            ) : null}
            {mutation.error ? (
              <p className="rounded-xl border border-blush-200 bg-blush-100 px-4 py-3 text-sm text-blush-900">
                {mutation.error.message}
              </p>
            ) : null}
            {created ? (
              <p className="rounded-xl border border-mint-200 bg-mint-100 px-4 py-3 text-sm text-mint-900">
                Trip created — taking you to the planning screen…
              </p>
            ) : null}

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                disabled={step === 0}
                onClick={() => setStep((value) => value - 1)}
              >
                <ArrowLeft />
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={() => void goToNextStep()}>
                  Next
                  <ArrowRight />
                </Button>
              ) : (
                <Button size="lg" disabled={mutation.isPending || created}>
                  <Check />
                  {mutation.isPending ? "Creating…" : "Plan my trip"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </section>
  );
}

export default function PlanPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">Loading…</div>}>
        <PlanWizard />
      </Suspense>
    </AuthGuard>
  );
}
