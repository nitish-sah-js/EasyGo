"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bus, CalendarDays, MapPin, Navigation, Plane, Search, Train, Users } from "lucide-react";
import type { PlaceSuggestion, TrainClassCode, TransportMode } from "@nexttour/shared";
import { Button } from "@/components/ui/button";
import { PlaceAutocompleteInput } from "@/components/place-autocomplete-input";
import { TrainClassPreferencePicker } from "@/components/train-class-picker";
import { TRAIN_CLASS_PREFERENCE_KEY } from "@/lib/train-class-preference";
import { collapse } from "@/lib/motion";
import { cn } from "@/lib/utils";

const tabs: Array<{ mode: TransportMode; label: string; icon: typeof Plane }> = [
  { mode: "FLIGHT", label: "Flight", icon: Plane },
  { mode: "TRAIN", label: "Train", icon: Train },
  { mode: "BUS", label: "Bus", icon: Bus },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The search card that overlaps the landing hero. It does not query anything on
 * its own — it collects the first four answers of the planning wizard and hands
 * them to /plan so the traveller starts on step three instead of step one.
 */
export function SearchPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<TransportMode>("FLIGHT");
  const [origin, setOrigin] = useState("");
  const [originPlace, setOriginPlace] = useState<PlaceSuggestion | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationPlace, setDestinationPlace] = useState<PlaceSuggestion | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [travelers, setTravelers] = useState("2");
  const [trainClass, setTrainClass] = useState<TrainClassCode | undefined>(undefined);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "TRAIN" && trainClass) {
      sessionStorage.setItem(TRAIN_CLASS_PREFERENCE_KEY, trainClass);
    } else {
      sessionStorage.removeItem(TRAIN_CLASS_PREFERENCE_KEY);
    }
    const params = new URLSearchParams({ transport: mode, travelers });
    if (origin.trim()) params.set("origin", origin.trim());
    if (originPlace) params.set("originPlaceId", originPlace.placeId);
    if (destination.trim()) params.set("destination", destination.trim());
    if (destinationPlace) params.set("destinationPlaceId", destinationPlace.placeId);
    if (departureDate) params.set("departureDate", departureDate);
    router.push(`/plan?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-surface/95 p-2 shadow-panel backdrop-blur-xl sm:p-3"
    >
      <div className="flex gap-1 border-b border-border px-2 pb-1 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.mode === mode;
          return (
            <button
              key={tab.mode}
              type="button"
              onClick={() => setMode(tab.mode)}
              aria-pressed={active}
              className={cn(
                "relative flex h-11 items-center gap-2 rounded-[12px] px-4 text-[0.9375rem] font-semibold transition duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                active ? "text-brand-700" : "text-muted-foreground hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
              {tab.label}
              {active ? (
                <motion.span
                  layoutId="search-tab-active"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-brand-600"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_1fr_1fr_0.8fr_auto] lg:items-end">
        <PanelField label="From" icon={<MapPin className="h-4 w-4" />}>
          <PlaceAutocompleteInput
            value={origin}
            onChange={setOrigin}
            onSelect={setOriginPlace}
            placeholder="Origin"
            ariaLabel="Origin"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </PanelField>
        <PanelField label="To" icon={<Navigation className="h-4 w-4" />}>
          <PlaceAutocompleteInput
            value={destination}
            onChange={setDestination}
            onSelect={setDestinationPlace}
            placeholder="Destination"
            ariaLabel="Destination"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </PanelField>
        <PanelField label="Date" icon={<CalendarDays className="h-4 w-4" />}>
          <input
            type="date"
            min={todayIso()}
            value={departureDate}
            onChange={(event) => setDepartureDate(event.target.value)}
            aria-label="Departure date"
            className="w-full bg-transparent text-sm font-medium outline-none"
          />
        </PanelField>
        <PanelField label="Travelers" icon={<Users className="h-4 w-4" />}>
          <select
            value={travelers}
            onChange={(event) => setTravelers(event.target.value)}
            aria-label="Travelers"
            className="w-full appearance-none bg-transparent text-sm font-medium outline-none"
          >
            {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "traveler" : "travelers"}
              </option>
            ))}
          </select>
        </PanelField>
        <Button size="lg" className="w-full lg:w-auto">
          <Search />
          Plan My Trip
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {mode === "TRAIN" ? (
          <motion.div
            key="train-class"
            variants={collapse}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden border-t border-border"
          >
            <div className="px-3 pb-3 pt-3">
              <TrainClassPreferencePicker value={trainClass} onChange={setTrainClass} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  );
}

function PanelField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3.5 py-2.5 transition duration-200 ease-out focus-within:-translate-y-0.5 focus-within:border-brand-400 focus-within:shadow-card focus-within:ring-4 focus-within:ring-brand-100 motion-reduce:focus-within:translate-y-0">
      <div className="field-label mb-1">{label}</div>
      <div className="flex items-center gap-2 text-brand-700">
        {icon}
        <div className="min-w-0 flex-1 text-foreground">{children}</div>
      </div>
    </div>
  );
}
