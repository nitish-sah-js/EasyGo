import {
  Bus,
  Camera,
  Hotel,
  MoreHorizontal,
  Plane,
  Utensils,
  Wallet,
} from "lucide-react";
import { formatInr, type BudgetBreakdown as BudgetBreakdownType } from "@nexttour/shared";
import { IconTile, type IconTone } from "@/components/ui/icon-tile";

const rows: Array<{
  key: keyof BudgetBreakdownType;
  label: string;
  icon: typeof Plane;
  tone: IconTone;
}> = [
  { key: "transport", label: "Transport", icon: Plane, tone: "soft" },
  { key: "accommodation", label: "Stay", icon: Hotel, tone: "mid" },
  { key: "food", label: "Food", icon: Utensils, tone: "base" },
  { key: "activities", label: "Activities", icon: Camera, tone: "deep" },
  { key: "localTransport", label: "Local transport", icon: Bus, tone: "base" },
  { key: "miscellaneous", label: "Miscellaneous", icon: MoreHorizontal, tone: "success" },
];

export function BudgetBreakdown({ budget }: { budget: BudgetBreakdownType }) {
  const used = Math.max(0, Math.min(100, budget.budgetPercentageUsed));
  const overBudget = !budget.isWithinBudget;

  return (
    <div className="space-y-4">
      <div className="ink-panel rounded-2xl p-5 shadow-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-brand-200">
              Estimated total
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight text-white">
              {formatInr(budget.totalEstimatedCost)}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/20">
            <Wallet className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className={
              overBudget
                ? "h-full rounded-full bg-gradient-to-r from-blush-300 to-blush-400"
                : "h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-100"
            }
            style={{ width: `${used}%` }}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-brand-200">
            {used.toFixed(0)}% of your {formatInr(budget.userBudget)} budget
          </span>
          <span className={overBudget ? "font-semibold text-blush-200" : "font-semibold text-brand-200"}>
            {overBudget ? "Over by " : "Remaining "}
            {formatInr(Math.abs(budget.remainingBudget))}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const Icon = row.icon;
          const amount = Number(budget[row.key]);
          const share = budget.totalEstimatedCost > 0 ? (amount / budget.totalEstimatedCost) * 100 : 0;
          return (
            <div
              key={row.key}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <IconTile tone={row.tone} size="sm">
                <Icon className="h-4 w-4" />
              </IconTile>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">{row.label}</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatInr(amount)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-brand-300"
                    style={{ width: `${Math.min(100, share)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
