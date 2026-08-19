import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

export const PLANNING_QUEUE_NAME = "trip-planning";

export interface PlanningJobData {
  tripId: string;
  userId: string;
}

let connection: IORedis | undefined;
let queue: Queue<PlanningJobData> | undefined;

export function createRedisConnection(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function getConnection(): IORedis {
  connection ??= createRedisConnection();
  return connection;
}

export function getPlanningQueue(): Queue<PlanningJobData> {
  queue ??= new Queue<PlanningJobData>(PLANNING_QUEUE_NAME, {
    connection: getConnection(),
  });
  return queue;
}

export async function enqueuePlanningJob(data: PlanningJobData) {
  return getPlanningQueue().add("plan-trip", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}
