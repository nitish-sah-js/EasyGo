import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function notFoundHandler(request: Request, _response: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${request.method} ${request.path}`));
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return response.status(422).json({
      message: "Validation failed",
      issues: error.issues,
    });
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return response.status(500).json({ message });
}
