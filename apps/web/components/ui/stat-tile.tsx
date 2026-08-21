import * as React from "react";
import { IconTile, type IconTone } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

/** Icon + uppercase caption + value, as used in the reference trip summary column. */
export function StatTile({
  icon,
  label,
  value,
  hint,
  tone = "lavender",
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: IconTone;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3.5", className)}>
      <IconTile tone={tone}>{icon}</IconTile>
      <div className="min-w-0 space-y-0.5">
        <div className="field-label">{label}</div>
        <div className="text-base font-semibold leading-snug text-foreground">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
    </div>
  );
}
