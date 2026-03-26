import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { ApiError } from "./errorHandler";
import type { UserRole } from "../models/User";

type JwtUser = {
  userId: string;
  role: UserRole;
};

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new ApiError(401, "Missing or invalid Authorization header", { code: "UNAUTHORIZED" }));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUser;
    if (!decoded?.userId || !decoded?.role) {
      return next(new ApiError(401, "Invalid token payload", { code: "UNAUTHORIZED" }));
    }

    (req as any).user = { id: decoded.userId, role: decoded.role };
    return next();
  } catch (_e) {
    return next(new ApiError(401, "Invalid or expired token", { code: "UNAUTHORIZED" }));
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user as { role?: UserRole } | undefined;
    if (!user?.role) return next(new ApiError(401, "Unauthorized", { code: "UNAUTHORIZED" }));
    if (!roles.includes(user.role)) {
      return next(new ApiError(403, "Forbidden: insufficient permissions", { code: "FORBIDDEN" }));
    }
    return next();
  };
}

