import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { ApiError } from "./errors";

const COOKIE_NAME = "nexttour_token";

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const cookieToken = request.cookies?.[COOKIE_NAME] as string | undefined;
  const authHeader = request.header("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return next(new ApiError(401, "User no longer exists"));
    }

    request.user = user;
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired authentication token"));
  }
}

export { COOKIE_NAME };
