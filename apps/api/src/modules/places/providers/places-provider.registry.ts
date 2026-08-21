import type {
  AttractionProvider,
  HotelProvider,
  RestaurantProvider,
} from "./places-provider.interface";
import { CachedAttractionProvider, CachedHotelProvider, CachedRestaurantProvider } from "./cached-places.provider";
import { RealAttractionProvider } from "./real-attraction.provider";
import { RealHotelProvider } from "./real-hotel.provider";
import { RealRestaurantProvider } from "./real-restaurant.provider";

export function getHotelProvider(): HotelProvider {
  return new CachedHotelProvider(new RealHotelProvider());
}

export function getAttractionProvider(): AttractionProvider {
  return new CachedAttractionProvider(new RealAttractionProvider());
}

export function getRestaurantProvider(): RestaurantProvider {
  return new CachedRestaurantProvider(new RealRestaurantProvider());
}
