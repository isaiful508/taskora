import { Router } from "express";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { validateBody } from "../../middleware/validate.js";
import { loginSchema, signupSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

authRouter.post("/signup", authLimiter, validateBody(signupSchema), async (req, res, next) => {
  try {
    const { user, token } = await authService.signup(req.body);
    res.cookie("token", token, cookieOptions);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body);
    res.cookie("token", token, cookieOptions);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", { ...cookieOptions, maxAge: 0 });
  res.json({ message: "Logged out" });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
