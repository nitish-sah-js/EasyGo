import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function statusLabel(status: string | undefined): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Planning…";
    case "COMPLETED":
      return "Completed";
    case "PARTIAL_SUCCESS":
      return "Partially done";
    case "FAILED":
      return "Failed";
    default:
      return status ?? "Unknown";
  }
}
