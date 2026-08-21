import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-6 gap-4",
        align === "center"
          ? "flex flex-col items-center text-center"
          : "flex flex-wrap items-end justify-between",
        className,
      )}
    >
      <div className={cn("space-y-1.5", align === "center" && "max-w-2xl")}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
