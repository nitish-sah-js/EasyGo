import type { PlanningProgressStep, PlanningStatus } from "@nexttour/shared";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export interface CurrentUserResponse {
  user?: CurrentUser;
}

export interface TripListItem {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  budget: number;
  status: PlanningStatus;
}

export interface TripResponse {
  trip: {
    id: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
    budget: number;
    status: PlanningStatus;
    preferences: {
      travelStyle: string;
      preferredTransport: string[];
      interests: string[];
      foodPreference: string;
      accommodationPreference: string;
    };
  };
}

export interface TripStatusResponse {
  tripId: string;
  status: PlanningStatus;
  progress: PlanningProgressStep[];
  providerNotes: string[];
  error?: string;
}

export interface PlanTripResponse {
  tripId: string;
  jobId: string;
}