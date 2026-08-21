"use client";

import Link from "next/link";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";

/** The hero's headline stack, staggering in on page load — it's already on
 *  screen at first paint, so this animates on mount rather than on scroll. */
export function HeroCopy() {
  return (
    <StaggerGroup
      onMount
      stagger={0.12}
      delayChildren={0.1}
      className="relative z-10 mx-auto max-w-7xl px-4 pb-40 pt-20 text-center sm:px-6 sm:pb-44 sm:pt-28 lg:px-8"
    >
      <StaggerItem>
        <Chip tone="onInk" className="mb-6">
          Live provider data
        </Chip>
      </StaggerItem>
      <StaggerItem>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Plan Your Journey.
          <br />
          <span className="text-brand-200">Discover More.</span>
        </h1>
      </StaggerItem>
      <StaggerItem>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-brand-100 sm:text-lg">
          Orchestrate the entire trip in one place — compare every way to get there, find a
          place to stay, and leave with a day-by-day itinerary that fits your budget.
        </p>
      </StaggerItem>
      <StaggerItem className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
      </StaggerItem>
    </StaggerGroup>
  );
}
