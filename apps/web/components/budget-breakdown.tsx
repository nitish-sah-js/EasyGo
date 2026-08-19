import { formatInr, type BudgetBreakdown as BudgetBreakdownType } from "@nexttour/shared";
import { Progress } from "@/components/ui/progress";

const rows: Array<[keyof BudgetBreakdownType, string]> = [
  ["transport", "Transport"],
  ["accommodation", "Hotel"],
  ["food", "Food"],
  ["activities", "Activities"],
  ["localTransport", "Local transport"],
  ["miscellaneous", "Miscellaneous"],
];

export function BudgetBreakdown({ budget }: { budget: BudgetBreakdownType }) {
  return (
    <div className="space-y-4">
      <Progress value={budget.budgetPercentageUsed} />
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-md border border-border bg-white p-3 text-sm">
            <span className="text-slate-600">{label}</span>
            <span className="font-semibold">{formatInr(Number(budget[key]))}</span>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border bg-slate-50 p-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatInr(budget.totalEstimatedCost)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
          <span>Budget {formatInr(budget.userBudget)}</span>
          <span>{budget.remainingBudget >= 0 ? "Remaining" : "Over"} {formatInr(Math.abs(budget.remainingBudget))}</span>
        </div>
      </div>
    </div>
  );
}
