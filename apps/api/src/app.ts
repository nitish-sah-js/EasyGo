import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/auth.routes";
import { budgetRoutes } from "./modules/budget/budget.routes";
import { mapsRoutes } from "./modules/maps/maps.routes";
import { placesRoutes } from "./modules/places/places.routes";
import { travelRouteRoutes } from "./modules/travel-route/travel-route.routes";
import { tripsRoutes } from "./modules/trips/trips.routes";
import { weatherRoutes } from "./modules/weather/weather.routes";
import { errorHandler, notFoundHandler } from "./middleware/errors";

/**
 * Allowed browser origins. Outside production the loopback host and port are not
 * worth pinning down — `next dev` moves to 3001+ whenever 3000 is occupied, and a
 * mismatch surfaces to the user only as a login request that never completes.
 */
function corsOrigins(): cors.CorsOptions["origin"] {
  if (env.NODE_ENV === "production") {
    return env.FRONTEND_URL;
  }

  const loopback = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/;
  return (origin, callback) => {
    if (!origin || env.FRONTEND_URL.includes(origin) || loopback.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  };
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use((request, response, next) => {
    const startedAt = Date.now();
    console.log(`[api hit] ${request.method} ${request.originalUrl}`);
    response.on("finish", () => {
      console.log(`[api] ${request.method} ${request.originalUrl} -> ${response.statusCode} (${Date.now() - startedAt}ms)`);
    });
    next();
  });

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      ai: env.AI_PROVIDER,
      providers: {
        flights: "SKY_SCRAPPER",
        trains: "REDBUS_RAILWAYS",
        buses: "REDBUS_BUSES",
        hotels: "REDBUS_HOTELS",
        places: "GOOGLE_PLACES",
        weather: "OPEN_METEO",
        maps: "HAVERSINE",
      },
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/trips", tripsRoutes);
  app.use("/api/places", placesRoutes);
  app.use("/api/weather", weatherRoutes);
  app.use("/api/maps", mapsRoutes);
  app.use("/api/travel-route", travelRouteRoutes);
  app.use("/api/budget", budgetRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
