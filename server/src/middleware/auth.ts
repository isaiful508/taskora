import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import type { Role } from "../../generated/prisma/client";
import { ApiError } from "./error";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    return next(ApiError.unauthorized());
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
