import { Router } from "express";
import { tripPlanningSchema } from "@nexttour/shared";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errors";
import { validateBody } from "../../middleware/validate";
import { BudgetService } from "./budget.service";

export const budgetRoutes = Router();

budgetRoutes.use(requireAuth);

budgetRoutes.post(
  "/estimate",
  validateBody(tripPlanningSchema),
  asyncHandler(async (request, response) => {
    const budgetService = new BudgetService();
    response.json({ budget: await budgetService.estimate(request.body) });
  }),
);