import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export type ApiErrorPayload = {
  message: string;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.statusCode = statusCode;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: `Not found: ${req.method} ${req.originalUrl}`,
  } satisfies ApiErrorPayload);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      details: err.details,
    } satisfies ApiErrorPayload);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: err.message,
      code: "VALIDATION_ERROR",
    } satisfies ApiErrorPayload);
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      message: `Invalid ${err.path}`,
      code: "VALIDATION_ERROR",
    } satisfies ApiErrorPayload);
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === 11000
  ) {
    return res.status(409).json({
      message: "Duplicate value",
      code: "CONFLICT",
      details: err,
    } satisfies ApiErrorPayload);
  }

  return res.status(500).json({
    message: "Internal server error",
  } satisfies ApiErrorPayload);
}
