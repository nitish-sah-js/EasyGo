-- CreateEnum
CREATE TYPE "TravelStyle" AS ENUM ('BUDGET', 'BALANCED', 'COMFORT', 'LUXURY');

-- CreateEnum
CREATE TYPE "FoodPreference" AS ENUM ('VEGETARIAN', 'VEGAN', 'NON_VEGETARIAN', 'LOCAL');

-- CreateEnum
CREATE TYPE "AccommodationPreference" AS ENUM ('BUDGET', 'MID_RANGE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('FLIGHT', 'TRAIN', 'BUS');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "travelers" INTEGER NOT NULL,
    "budget" INTEGER NOT NULL,
    "status" "PlanningStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPreference" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "travelStyle" "TravelStyle" NOT NULL,
    "preferredTransport" TEXT[],
    "interests" TEXT[],
    "foodPreference" "FoodPreference" NOT NULL,
    "accommodationPreference" "AccommodationPreference" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningJob" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bullJobId" TEXT,
    "status" "PlanningStatus" NOT NULL DEFAULT 'PENDING',
    "progress" JSONB NOT NULL,
    "providerNotes" TEXT[],
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportOption" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "price" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteOption" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "totalPrice" INTEGER NOT NULL,
    "totalDurationMinutes" INTEGER NOT NULL,
    "transferCount" INTEGER NOT NULL,
    "modes" TEXT[],
    "score" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "pricePerNight" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attraction" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherData" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Itinerary" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryActivity" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "locationName" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "estimatedCost" INTEGER NOT NULL,
    "travelTimeMinutes" INTEGER,
    "notes" TEXT,

    CONSTRAINT "ItineraryActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetBreakdown" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "transport" INTEGER NOT NULL,
    "accommodation" INTEGER NOT NULL,
    "food" INTEGER NOT NULL,
    "activities" INTEGER NOT NULL,
    "localTransport" INTEGER NOT NULL,
    "miscellaneous" INTEGER NOT NULL,
    "totalEstimatedCost" INTEGER NOT NULL,
    "userBudget" INTEGER NOT NULL,
    "remainingBudget" INTEGER NOT NULL,
    "budgetPercentageUsed" DOUBLE PRECISION NOT NULL,
    "isWithinBudget" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TripPreference_tripId_key" ON "TripPreference"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningJob_tripId_key" ON "PlanningJob"("tripId");

-- CreateIndex
CREATE INDEX "PlanningJob_status_idx" ON "PlanningJob"("status");

-- CreateIndex
CREATE INDEX "TransportOption_tripId_idx" ON "TransportOption"("tripId");

-- CreateIndex
CREATE INDEX "TransportOption_mode_idx" ON "TransportOption"("mode");

-- CreateIndex
CREATE INDEX "RouteOption_tripId_idx" ON "RouteOption"("tripId");

-- CreateIndex
CREATE INDEX "RouteOption_isRecommended_idx" ON "RouteOption"("isRecommended");

-- CreateIndex
CREATE INDEX "Hotel_tripId_idx" ON "Hotel"("tripId");

-- CreateIndex
CREATE INDEX "Hotel_city_idx" ON "Hotel"("city");

-- CreateIndex
CREATE INDEX "Attraction_tripId_idx" ON "Attraction"("tripId");

-- CreateIndex
CREATE INDEX "Attraction_city_idx" ON "Attraction"("city");

-- CreateIndex
CREATE INDEX "Restaurant_tripId_idx" ON "Restaurant"("tripId");

-- CreateIndex
CREATE INDEX "Restaurant_city_idx" ON "Restaurant"("city");

-- CreateIndex
CREATE INDEX "WeatherData_tripId_idx" ON "WeatherData"("tripId");

-- CreateIndex
CREATE INDEX "WeatherData_city_idx" ON "WeatherData"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_tripId_key" ON "Itinerary"("tripId");

-- CreateIndex
CREATE INDEX "ItineraryDay_itineraryId_idx" ON "ItineraryDay"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryActivity_itineraryDayId_idx" ON "ItineraryActivity"("itineraryDayId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetBreakdown_tripId_key" ON "BudgetBreakdown"("tripId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPreference" ADD CONSTRAINT "TripPreference_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningJob" ADD CONSTRAINT "PlanningJob_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOption" ADD CONSTRAINT "TransportOption_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteOption" ADD CONSTRAINT "RouteOption_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherData" ADD CONSTRAINT "WeatherData_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryActivity" ADD CONSTRAINT "ItineraryActivity_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetBreakdown" ADD CONSTRAINT "BudgetBreakdown_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
