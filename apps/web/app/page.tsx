import Link from "next/link";
import { Bot, Bus, Compass, Hotel, MapPin, Plane, Route, Train, Utensils, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeading } from "@/components/ui/section-heading";
import { DestinationGrid } from "@/components/destination-grid";
import { HeroScene } from "@/components/hero-scene";
import { SearchPanel } from "@/components/search-panel";

const journeySteps = [
  {
    label: "Discover",
    icon: Compass,
    tone: "base" as const,
    copy: "Pick a destination and tell us the style, food and interests you travel with.",
  },
  {
    label: "Compare",
    icon: Route,
    tone: "soft" as const,
    copy: "Flights, trains and buses are searched together, including mixed-mode routes.",
  },
  {
    label: "Stay",
    icon: Hotel,
    tone: "mid" as const,
    copy: "Hotels are matched to your budget tier with live nightly rates where available.",
  },
  {
    label: "Explore",
    icon: MapPin,
    tone: "base" as const,
    copy: "A day-by-day itinerary with places, meals, weather and a full cost breakdown.",
  },
];

const coverage = [
  { label: "Flights", icon: Plane, tone: "soft" as const },
  { label: "Trains", icon: Train, tone: "base" as const },
  { label: "Buses", icon: Bus, tone: "deep" as const },
  { label: "Hotels", icon: Hotel, tone: "mid" as const },
  { label: "Places", icon: MapPin, tone: "mid" as const },
  { label: "Food", icon: Utensils, tone: "base" as const },
  { label: "Budget", icon: Wallet, tone: "soft" as const },
  { label: "AI itinerary", icon: Bot, tone: "deep" as const },
];

export default function HomePage() {
  return (
    <>
      <section className="relative">
        <div className="relative isolate overflow-hidden">
          <HeroScene />
          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-40 pt-20 text-center sm:px-6 sm:pb-44 sm:pt-28 lg:px-8">
            <Chip tone="onInk" className="mb-6">
              Live provider data 
            </Chip>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
              Plan Your Journey.
              <br />
              <span className="text-brand-200">Discover More.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-brand-100 sm:text-lg">
              Orchestrate the entire trip in one place — compare every way to get there, find a
              place to stay, and leave with a day-by-day itinerary that fits your budget.
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/plan" className="sm:w-auto">
                <Button size="lg" variant="onInkSolid" shape="pill" block="responsive">
                  <Plane />
                  Start planning
                </Button>
              </Link>
              <Link href="/trips" className="sm:w-auto">
                <Button size="lg" variant="onInk" shape="pill" block="responsive">
                  View my trips
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mx-auto -mt-28 max-w-6xl px-4 sm:-mt-32 sm:px-6 lg:px-8">
          <SearchPanel />
        </div>
      </section>

      <DestinationGrid />

      <section className="border-y border-border bg-surface/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            align="center"
            title="Plan Your Entire Journey"
            subtitle="One flow from the first idea to the return leg — nothing stitched together by hand."
          />
          <ol className="relative mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <li
              aria-hidden
              className="pointer-events-none absolute inset-x-[12%] top-7 hidden h-px bg-gradient-to-r from-brand-100 via-brand-300 to-brand-100 lg:block"
            />
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="relative flex flex-col items-center text-center">
                  <IconTile tone={step.tone} size="lg" className="rounded-full bg-surface shadow-card ring-1 ring-border">
                    <Icon className="h-6 w-6" />
                  </IconTile>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-400">0{index + 1}</span>
                    <h3 className="text-base font-bold tracking-tight text-foreground">{step.label}</h3>
                  </div>
                  <p className="mt-2 max-w-[16rem] text-sm leading-6 text-muted-foreground">{step.copy}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          title="Everything searched in one pass"
          subtitle="Each planning run fans out across these providers and reports what came back."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {coverage.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:shadow-lift"
              >
                <IconTile tone={item.tone} size="sm">
                  <Icon className="h-[1.1rem] w-[1.1rem]" />
                </IconTile>
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
