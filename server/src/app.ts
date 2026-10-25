import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { submissionsRouter } from "./modules/submissions/submissions.routes";

export function createApp() {
  const app = express();
  const allowedOrigins = new Set([env.CORS_ORIGIN]);

  if (env.NODE_ENV === "development") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://localhost:3001");
  }

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, origin !== undefined && allowedOrigins.has(origin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/submissions", submissionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
