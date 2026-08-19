import { Clock, CloudSun, IndianRupee, MapPin } from "lucide-react";
import { formatInr, formatMinutes, type GeneratedItinerary } from "@nexttour/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ItineraryTimeline({ itinerary }: { itinerary: GeneratedItinerary }) {
  return (
    <div className="space-y-5">
      {itinerary.itinerary.map((day) => (
        <Card key={day.dayNumber}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>Day {day.dayNumber}</span>
              <span className="text-sm font-medium text-slate-600">{day.date}</span>
            </CardTitle>
            {day.weather ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CloudSun className="h-4 w-4 text-cyan-700" />
                {day.weather.condition.replace("_", " ")} · {day.weather.temperature}°C · {day.weather.rainProbability}% rain
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {day.activities.map((activity) => (
                <div key={activity.id} className="grid gap-3 rounded-md border border-border bg-white p-3 sm:grid-cols-[5rem_1fr]">
                  <div className="font-semibold text-cyan-800">{activity.time}</div>
                  <div>
                    <div className="font-semibold">{activity.title}</div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                      {activity.locationName ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {activity.locationName}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatMinutes(activity.durationMinutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {formatInr(activity.estimatedCost)}
                      </span>
                    </div>
                    {activity.notes ? <p className="mt-2 text-sm text-slate-600">{activity.notes}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
