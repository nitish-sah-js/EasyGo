import { hashPassword } from "../apps/api/src/lib/password";
import { prisma } from "../apps/api/src/lib/prisma";
import { planningService } from "../apps/api/src/modules/planning/planning.service";
import { createInitialProgress } from "../apps/api/src/modules/planning/progress";
import { toJson } from "../apps/api/src/lib/json";

async function main() {
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Demo Traveler",
      email: "demo@nexttour.local",
      passwordHash: await hashPassword("password123"),
      trips: {
        create: {
          origin: "Patna",
          destination: "Goa",
          departureDate: new Date("2026-08-20T00:00:00.000Z"),
          returnDate: new Date("2026-08-25T00:00:00.000Z"),
          travelers: 2,
          budget: 30_000,
          preferences: {
            create: {
              travelStyle: "BUDGET",
              preferredTransport: ["FLIGHT", "TRAIN", "BUS"],
              interests: ["BEACH", "NATURE", "HISTORY"],
              foodPreference: "VEGETARIAN",
              accommodationPreference: "BUDGET",
            },
          },
          planningJob: {
            create: {
              status: "PENDING",
              progress: toJson(createInitialProgress()),
              providerNotes: [],
            },
          },
        },
      },
    },
    include: { trips: true },
  });

  const demoTrip = user.trips[0];
  if (!demoTrip) {
    throw new Error("Demo trip was not created");
  }

  await planningService.planTrip(demoTrip.id);

  console.log("Seeded demo account:");
  console.log("  email: demo@nexttour.local");
  console.log("  password: password123");
  console.log(`  trip: ${demoTrip.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
