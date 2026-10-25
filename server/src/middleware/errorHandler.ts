import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { ApiError } from "./error";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: "Route not found" });
}

function fieldErrorsFromZod(err: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_root";
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message, errors: err.errors });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    res.status(409).json({ message: "A record with the same unique value already exists" });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ message: "Validation failed", errors: fieldErrorsFromZod(err) });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
}
