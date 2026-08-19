import type { TripResultPayload } from "@nexttour/shared";
import { apiFetch } from "@/lib/api";
import type { TripStatusResponse } from "@/types/trips";

export function getTripResult(tripId: string): Promise<TripResultPayload> {
  return apiFetch<TripResultPayload>(`/api/trips/${tripId}/result`);
}

export function getTripStatus(tripId: string): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/api/trips/${tripId}/status`);
}

export function startTripPlanning(tripId: string): Promise<{ tripId: string }> {
  return apiFetch<{ tripId: string }>(`/api/trips/${tripId}/plan`, { method: "POST" });
}

export function deleteTrip(tripId: string): Promise<{ deleted: boolean; tripId: string }> {
  return apiFetch<{ deleted: boolean; tripId: string }>(`/api/trips/${tripId}`, { method: "DELETE" });
}