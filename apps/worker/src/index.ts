import { Worker } from "bullmq";
import dotenv from "dotenv";
import { createRedisConnection, PLANNING_QUEUE_NAME, type PlanningJobData } from "@nexttour/api/queue";
import { planningService } from "@nexttour/api/planning";

dotenv.config();

const worker = new Worker<PlanningJobData>(
  PLANNING_QUEUE_NAME,
  async (job) => {
    await planningService.planTrip(job.data.tripId);
  },
  {
    connection: createRedisConnection(),
    concurrency: 3,
  },
);

worker.on("completed", (job) => {
  console.log(`Planning job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Planning job ${job?.id ?? "unknown"} failed`, error);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});

console.log(`NextTour worker listening on ${PLANNING_QUEUE_NAME}`);
