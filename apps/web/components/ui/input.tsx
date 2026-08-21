import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-lavender-400 focus:ring-4 focus:ring-lavender-100",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-12 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition focus:border-lavender-400 focus:ring-4 focus:ring-lavender-100",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="field-label block">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
