import { Bot, Bus, Compass, Hotel, MapPin, Plane, Route, Train, Utensils, Wallet } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeading } from "@/components/ui/section-heading";
import { DestinationGrid } from "@/components/destination-grid";
import { HeroCopy } from "@/components/hero-copy";
import { HeroParallax } from "@/components/hero-parallax";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
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
          <HeroParallax />
          <HeroCopy />
        </div>

        <Reveal
          onMount
          delay={0.55}
          className="relative mx-auto -mt-28 max-w-6xl px-4 sm:-mt-32 sm:px-6 lg:px-8"
        >
          <SearchPanel />
        </Reveal>
      </section>

      <DestinationGrid />

      <section className="border-y border-border bg-surface/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading
              align="center"
              title="Plan Your Entire Journey"
              subtitle="One flow from the first idea to the return leg — nothing stitched together by hand."
            />
          </Reveal>
          <StaggerGroup as="ol" stagger={0.12} className="relative mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <li
              aria-hidden
              className="pointer-events-none absolute inset-x-[12%] top-7 hidden h-px bg-gradient-to-r from-brand-100 via-brand-300 to-brand-100 lg:block"
            />
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <StaggerItem as="li" key={step.label} className="relative flex flex-col items-center text-center">
                  <IconTile tone={step.tone} size="lg" className="rounded-full bg-surface shadow-card ring-1 ring-border">
                    <Icon className="h-6 w-6" />
                  </IconTile>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-400">0{index + 1}</span>
                    <h3 className="text-base font-bold tracking-tight text-foreground">{step.label}</h3>
                  </div>
                  <p className="mt-2 max-w-[16rem] text-sm leading-6 text-muted-foreground">{step.copy}</p>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            title="Everything searched in one pass"
            subtitle="Each planning run fans out across these providers and reports what came back."
          />
        </Reveal>
        <StaggerGroup stagger={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {coverage.map((item) => {
            const Icon = item.icon;
            return (
              <StaggerItem
                size="sm"
                key={item.label}
                whileHover={{ y: -3 }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift"
              >
                <IconTile tone={item.tone} size="sm">
                  <Icon className="h-[1.1rem] w-[1.1rem]" />
                </IconTile>
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </section>
    </>
  );
}
