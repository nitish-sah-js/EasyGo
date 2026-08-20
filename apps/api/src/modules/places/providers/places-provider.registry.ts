import type {
  AttractionProvider,
  HotelProvider,
  RestaurantProvider,
} from "./places-provider.interface";
import { RealAttractionProvider } from "./real-attraction.provider";
import { RealHotelProvider } from "./real-hotel.provider";
import { RealRestaurantProvider } from "./real-restaurant.provider";

export function getHotelProvider(): HotelProvider {
  return new RealHotelProvider();
}

export function getAttractionProvider(): AttractionProvider {
  return new RealAttractionProvider();
}

export function getRestaurantProvider(): RestaurantProvider {
  return new RealRestaurantProvider();
}
