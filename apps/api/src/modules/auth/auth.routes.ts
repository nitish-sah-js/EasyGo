import { Router } from "express";
import { loginSchema, registerSchema } from "@nexttour/shared";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errors";
import { validateBody } from "../../middleware/validate";
import { clearAuthCookie, loginUser, registerUser } from "./auth.service";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (request, response) => {
    const user = await registerUser(request.body, response);
    response.status(201).json({ user });
  }),
);

authRoutes.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (request, response) => {
    const user = await loginUser(request.body, response);
    response.json({ user });
  }),
);

authRoutes.post("/logout", (_request, response) => {
  clearAuthCookie(response);
  response.status(204).send();
});

authRoutes.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user });
});
