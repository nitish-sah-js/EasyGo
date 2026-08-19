import { env } from "../../../config/env";
import type {
  AttractionProvider,
  HotelProvider,
  RestaurantProvider,
} from "./places-provider.interface";
import { MockAttractionProvider } from "./mock-attraction.provider";
import { MockHotelProvider } from "./mock-hotel.provider";
import { MockRestaurantProvider } from "./mock-restaurant.provider";

function modeGuard(): "MOCK" {
  if (env.TRAVEL_DATA_MODE !== "MOCK") {
    throw new Error(
      `TRAVEL_DATA_MODE=${env.TRAVEL_DATA_MODE} is not implemented. Real places providers are not available in this MVP.`,
    );
  }
  return "MOCK";
}

export function getHotelProvider(): HotelProvider {
  modeGuard();
  return new MockHotelProvider();
}

export function getAttractionProvider(): AttractionProvider {
  modeGuard();
  return new MockAttractionProvider();
}

export function getRestaurantProvider(): RestaurantProvider {
  modeGuard();
  return new MockRestaurantProvider();
}