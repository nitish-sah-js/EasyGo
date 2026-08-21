import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-3 overflow-hidden rounded-full bg-lavender-100", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-lavender-400 to-aqua-400 transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
