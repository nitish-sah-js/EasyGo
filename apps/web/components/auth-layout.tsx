import * as React from "react";
import { Compass, Route, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const highlights = [
  { icon: Compass, copy: "Flights, trains and buses compared in a single search" },
  { icon: Sparkles, copy: "A day-by-day itinerary built around your interests" },
  { icon: ShieldCheck, copy: "Live provider data — partial results are labelled, never faked" },
];

/** Split auth screen: brand panel on the ink surface, form card alongside. */
export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-stretch gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="ink-panel hidden flex-col justify-between rounded-2xl p-9 shadow-ink lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
            <Route className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">NextTour</span>
        </div>
        <div className="space-y-7">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Plan the whole journey,
            <br />
            <span className="text-aqua-200">not just the flight.</span>
          </h2>
          <ul className="space-y-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.copy} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-inset ring-white/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-6 text-lavender-100">{item.copy}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-lavender-200">Unified travel planning for eight Indian cities.</p>
      </div>

      <div className="flex items-center">
        <Card className="w-full">
          <CardContent className="space-y-6 pt-8">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            <p className="border-t border-border pt-5 text-sm text-muted-foreground">{footer}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
