import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

// Authenticated requests are keyed by user id, anonymous ones by IP.
// `ipKeyGenerator` normalises IPv6 addresses into a /64 subnet so a single
// host cannot rotate through addresses to bypass the limit.
const keyGenerator = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown");

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ message: "Too many attempts. Please try again after 15 minutes." });
  },
});

export const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ message: "Too many submissions. Please wait before submitting again." });
  },
});
