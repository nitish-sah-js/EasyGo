import type { PlanningProgressStep } from "@nexttour/shared";

export function createInitialProgress(): PlanningProgressStep[] {
  return [
    { key: "preferences", label: "Understanding preferences", status: "PENDING" },
    { key: "transport", label: "Finding transport", status: "PENDING" },
    { key: "hotels", label: "Finding accommodation", status: "PENDING" },
    { key: "attractions", label: "Discovering attractions", status: "PENDING" },
    { key: "restaurants", label: "Finding restaurants", status: "PENDING" },
    { key: "weather", label: "Checking weather", status: "PENDING" },
    { key: "routes", label: "Optimizing routes", status: "PENDING" },
    { key: "budget", label: "Calculating budget", status: "PENDING" },
    { key: "itinerary", label: "Creating itinerary", status: "PENDING" },
    { key: "store", label: "Saving plan", status: "PENDING" },
  ];
}

export function markProgress(
  progress: PlanningProgressStep[],
  key: PlanningProgressStep["key"],
  status: PlanningProgressStep["status"],
): PlanningProgressStep[] {
  return progress.map((step) => (step.key === key ? { ...step, status } : step));
}
