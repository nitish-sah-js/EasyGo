import { formatInr, tripDateRange, type ItineraryActivity, type ItineraryDay } from "@nexttour/shared";
import type { AIProvider, ItineraryContext } from "./ai-provider.interface";

function time(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function rainyDay(weatherCondition?: string): boolean {
  return weatherCondition === "HEAVY_RAIN" || weatherCondition === "LIGHT_RAIN";
}

function travelTime(label: string, context: ItineraryContext): number {
  const distance = context.mapDistances?.[label];
  return distance?.travelTimeMinutes ?? 25;
}

/**
 * Deterministic, rule-based itinerary builder over the *real* places, route and
 * weather already gathered for the trip. It invents no travel data — it only
 * schedules what the providers returned. Used as the fallback when the Groq API
 * is unavailable or rate limited, so planning degrades instead of failing.
 */
export class TemplateAIProvider implements AIProvider {
  readonly name = "TEMPLATE_AI";

  async generateItinerary(context: ItineraryContext) {
    const dates = tripDateRange(context.request.departureDate, context.request.returnDate);
    const indoorCategories = new Set(["MUSEUM", "CULTURE", "RELIGIOUS", "SHOPPING"]);
    const attractions = [...context.attractions].sort((left, right) => {
      const leftInterest = context.request.interests.includes(left.category) ? 1 : 0;
      const rightInterest = context.request.interests.includes(right.category) ? 1 : 0;
      return rightInterest - leftInterest || left.entryFee - right.entryFee || right.rating - left.rating;
    });

    const days: ItineraryDay[] = dates.map((date, dayIndex) => {
      const weather = context.weather.find((item) => item.date === date);
      const activityPool = rainyDay(weather?.condition)
        ? attractions.filter((attraction) => indoorCategories.has(attraction.category))
        : attractions;
      const firstAttraction = activityPool[(dayIndex * 2) % activityPool.length] ?? attractions[0];
      const secondAttraction = activityPool[(dayIndex * 2 + 1) % activityPool.length] ?? attractions[1];
      const lunch = context.restaurants[dayIndex % context.restaurants.length];
      const dinner = context.restaurants[(dayIndex + 1) % context.restaurants.length];
      const activities: ItineraryActivity[] = [];

      if (dayIndex === 0) {
        const route = context.route;
        if (route) {
          activities.push({
            id: `day-${dayIndex + 1}-arrival`,
            time: time(8),
            title: `Depart from ${context.request.origin}`,
            category: "TRANSPORT",
            ...(route.segments[0]?.origin.name ? { locationName: route.segments[0].origin.name } : {}),
            durationMinutes: route.totalDurationMinutes,
            estimatedCost: route.totalPrice * context.request.travelers,
            ...(route.recommendationReason ? { notes: route.recommendationReason } : {}),
          });
        }

        const hotel = context.hotel;
        if (hotel) {
          activities.push({
            id: `day-${dayIndex + 1}-checkin`,
            time: time(13),
            title: `Check in at ${hotel.name}`,
            category: "HOTEL",
            locationName: hotel.location,
            durationMinutes: 45,
            estimatedCost: hotel.pricePerNight,
            travelTimeMinutes: 30,
          });
        }
      }

      if (firstAttraction) {
        activities.push({
          id: `day-${dayIndex + 1}-${firstAttraction.id}`,
          time: dayIndex === 0 ? time(15) : time(9),
          title: firstAttraction.name,
          category: "ATTRACTION",
          locationName: firstAttraction.location,
          durationMinutes: firstAttraction.recommendedDurationMinutes,
          estimatedCost: firstAttraction.entryFee * context.request.travelers,
          travelTimeMinutes: travelTime(firstAttraction.id, context),
          notes: `${firstAttraction.bestTimeToVisit}; matches ${firstAttraction.category.toLowerCase()} interest.`,
        });
      }

      if (lunch) {
        activities.push({
          id: `day-${dayIndex + 1}-lunch`,
          time: time(12, 30),
          title: `Lunch at ${lunch.name}`,
          category: "RESTAURANT",
          locationName: lunch.location,
          durationMinutes: 75,
          estimatedCost: lunch.mealCostPerPerson * context.request.travelers,
          travelTimeMinutes: 20,
          notes: `${lunch.cuisine}; fits ${context.request.foodPreference.toLowerCase().replace("_", " ")} preference.`,
        });
      }

      if (secondAttraction) {
        activities.push({
          id: `day-${dayIndex + 1}-${secondAttraction.id}`,
          time: dayIndex === dates.length - 1 ? time(10, 30) : time(16),
          title: secondAttraction.name,
          category: "ATTRACTION",
          locationName: secondAttraction.location,
          durationMinutes: secondAttraction.recommendedDurationMinutes,
          estimatedCost: secondAttraction.entryFee * context.request.travelers,
          travelTimeMinutes: travelTime(secondAttraction.id, context),
          notes: rainyDay(weather?.condition)
            ? "Rain-aware indoor or covered option."
            : `${secondAttraction.bestTimeToVisit} is recommended.`,
        });
      }

      if (dinner && dayIndex !== dates.length - 1) {
        activities.push({
          id: `day-${dayIndex + 1}-dinner`,
          time: time(20),
          title: `Dinner at ${dinner.name}`,
          category: "RESTAURANT",
          locationName: dinner.location,
          durationMinutes: 90,
          estimatedCost: dinner.mealCostPerPerson * context.request.travelers,
          travelTimeMinutes: 18,
          notes: `${dinner.cuisine} pick near the evening route.`,
        });
      }

      if (dayIndex === dates.length - 1) {
        activities.push({
          id: `day-${dayIndex + 1}-checkout`,
          time: time(18),
          title: "Return buffer and checkout",
          category: "FREE_TIME",
          ...(context.hotel ? { locationName: context.hotel.name } : {}),
          durationMinutes: 90,
          estimatedCost: 0,
          notes: "Keeps the final evening flexible for delays or last-minute shopping.",
        });
      }

      return {
        dayNumber: dayIndex + 1,
        date,
        summary: rainyDay(weather?.condition)
          ? "Indoor-friendly plan with shorter outdoor windows."
          : "Balanced sightseeing with food stops and recovery time.",
        ...(weather ? { weather } : {}),
        activities: activities.sort((left, right) => left.time.localeCompare(right.time)),
      };
    });

    const recommendation = context.budget.isWithinBudget
      ? "Balanced budget plan"
      : "Best available plan above budget";
    const reason = context.budget.isWithinBudget
      ? `This plan stays within ${formatInr(context.request.budget)} while prioritizing ${context.request.interests.join(", ").toLowerCase()} and ${context.request.foodPreference.toLowerCase().replace("_", " ")} food.`
      : `The closest complete plan is estimated at ${formatInr(context.budget.totalEstimatedCost)}, so reducing hotel category or transport comfort would help meet ${formatInr(context.request.budget)}.`;

    return {
      recommendation,
      reason,
      itinerary: days,
    };
  }
}
