"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Chip, FilterChip } from "@/components/ui/chip";
import { Scenic } from "@/components/ui/scenic";
import { destinationFilters, destinations, type Destination } from "@/lib/destinations";
import { SectionHeading } from "@/components/ui/section-heading";

function planHref(city: string): string {
  return `/plan?destination=${encodeURIComponent(city)}`;
}

function FeaturedCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={planHref(destination.city)}
      className="group relative block overflow-hidden rounded-2xl shadow-card ring-1 ring-border transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
    >
      <Scenic seed={destination.city} scrim className="h-[22rem] sm:h-[27rem]">
        <div className="flex h-full flex-col justify-end p-6">
          <Chip tone="onInk" className="mb-3 self-start">
            <MapPin className="h-3.5 w-3.5" />
            {destination.region}
          </Chip>
          <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {destination.city}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/85">{destination.blurb}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {destination.interests.map((interest) => (
                <Chip key={interest} tone="onInk" className="text-[0.7rem]">
                  {interest.replace("_", " ")}
                </Chip>
              ))}
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-lavender-800 transition group-hover:gap-3">
              Plan this trip
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Scenic>
    </Link>
  );
}

function CompactCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={planHref(destination.city)}
      className="group relative block overflow-hidden rounded-2xl shadow-card ring-1 ring-border transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
    >
      <Scenic seed={destination.city} scrim className="h-[12.5rem]">
        <div className="flex h-full flex-col justify-end p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-white">{destination.city}</h3>
              <p className="truncate text-xs text-white/80">{destination.region}</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lavender-800 transition group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Scenic>
    </Link>
  );
}

export function DestinationGrid() {
  const [activeFilter, setActiveFilter] = useState(destinationFilters[0]!.label);

  const visible = useMemo(() => {
    const filter = destinationFilters.find((item) => item.label === activeFilter);
    if (!filter?.interest) return destinations;
    return destinations.filter((item) => item.interests.includes(filter.interest!));
  }, [activeFilter]);

  const [featured, ...rest] = visible;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        title="Explore Popular Destinations"
        subtitle="Every city here resolves against live transport, stay and place providers."
        action={destinationFilters.map((filter) => (
          <FilterChip
            key={filter.label}
            active={activeFilter === filter.label}
            onClick={() => setActiveFilter(filter.label)}
          >
            {filter.label}
          </FilterChip>
        ))}
      />

      {featured ? (
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <FeaturedCard destination={featured} />
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.slice(0, 4).map((destination) => (
              <CompactCard key={destination.city} destination={destination} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No destinations match this filter yet.</p>
      )}

      {rest.length > 4 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(4).map((destination) => (
            <CompactCard key={destination.city} destination={destination} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
