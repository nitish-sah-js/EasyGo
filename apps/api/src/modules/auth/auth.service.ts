import type { Response } from "express";
import { env } from "../../config/env";
import { COOKIE_NAME } from "../../middleware/auth";
import { ApiError } from "../../middleware/errors";
import { signAuthToken } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import { prisma } from "../../lib/prisma";
import type { LoginInput, RegisterInput } from "@nexttour/shared";

function publicUser(user: { id: string; name: string; email: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

/**
 * In production the web app (Vercel) and this API (e.g. Railway) are served from
 * different domains, so the browser treats every request between them as
 * cross-site. `SameSite=Lax` cookies are withheld from cross-site `fetch`/XHR
 * calls (only sent on top-level navigation), which would silently break auth
 * after login. `SameSite=None` restores that, and requires `Secure`.
 */
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/",
} as const;

function setAuthCookie(response: Response, token: string) {
  response.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1_000,
  });
}

export async function registerUser(input: RegisterInput, response: Response) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
    },
    select: { id: true, name: true, email: true },
  });

  const token = signAuthToken({ userId: user.id, email: user.email });
  setAuthCookie(response, token);
  return publicUser(user);
}

export async function loginUser(input: LoginInput, response: Response) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signAuthToken({ userId: user.id, email: user.email });
  setAuthCookie(response, token);
  return publicUser(user);
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(COOKIE_NAME, cookieOptions);
}
