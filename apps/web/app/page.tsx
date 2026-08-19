import Link from "next/link";
import { Bot, Bus, Hotel, MapPin, Plane, Train, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const capabilityIcons = [
  { label: "Flights", icon: Plane },
  { label: "Trains", icon: Train },
  { label: "Buses", icon: Bus },
  { label: "Hotels", icon: Hotel },
  { label: "Places", icon: MapPin },
  { label: "Food", icon: Utensils },
  { label: "AI", icon: Bot },
];

export default function HomePage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <div className="space-y-8">
        <Badge>Mock-data MVP</Badge>
        <div className="max-w-2xl space-y-5">
          <h1 className="text-4xl font-bold leading-tight tracking-normal text-slate-950 sm:text-6xl">
            Plan Your Entire Trip in One Place
          </h1>
          <p className="text-lg leading-8 text-slate-650">
            Compare routes, discover stays and places, and get a personalized itinerary.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/plan">
            <Button className="w-full sm:w-auto">
              <Plane className="h-4 w-4" />
              Plan a Trip
            </Button>
          </Link>
          <Link href="/trips">
            <Button className="w-full sm:w-auto" variant="secondary">
              View Trips
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-border bg-white shadow-panel">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-emerald-50/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(8,145,178,0.12),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(5,150,105,0.12),transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white/80 to-cyan-50/60" />
        <div className="relative flex h-full min-h-[520px] flex-col justify-between p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {capabilityIcons.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-border bg-white/90 p-3 shadow-sm">
                  <Icon className="mb-3 h-5 w-5 text-cyan-700" />
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                </div>
              );
            })}
          </div>

          <div className="space-y-7">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-cyan-600" />
              <div className="route-line h-0.5 flex-1" />
              <div className="h-3 w-3 rounded-full bg-emerald-600" />
              <div className="route-line h-0.5 flex-1" />
              <div className="h-3 w-3 rounded-full bg-amber-500" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="text-sm text-slate-500">Origin</div>
                <div className="text-xl font-semibold">Patna</div>
              </div>
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="text-sm text-slate-500">Mixed route</div>
                <div className="text-xl font-semibold">Train + Flight</div>
              </div>
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="text-sm text-slate-500">Destination</div>
                <div className="text-xl font-semibold">Goa</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
