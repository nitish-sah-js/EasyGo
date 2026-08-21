import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`NextTour API running on http://localhost:${env.API_PORT}`);
  console.log(`[cache] transport=${env.TRANSPORT_CACHE_TTL_SECONDS}s hotels=${env.HOTEL_CACHE_TTL_SECONDS}s places=${env.PLACES_CACHE_TTL_SECONDS}s weather=${env.WEATHER_CACHE_TTL_SECONDS}s`);
});
