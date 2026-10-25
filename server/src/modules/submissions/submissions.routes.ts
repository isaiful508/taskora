import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { submissionLimiter } from "../../middleware/rateLimit";
import { validateBody } from "../../middleware/validate";
import { createSubmissionSchema, listQuerySchema, updateStatusSchema } from "./submissions.schema";
import * as submissionsService from "./submissions.service";

export const submissionsRouter = Router();

submissionsRouter.use(requireAuth);

submissionsRouter.post(
  "/",
  requireRole("STUDENT"),
  submissionLimiter,
  validateBody(createSubmissionSchema),
  async (req, res, next) => {
    try {
      const submission = await submissionsService.createSubmission(req.user!.id, req.body);
      res.status(201).json({ submission });
    } catch (err) {
      next(err);
    }
  },
);

submissionsRouter.get("/mine", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const submissions = await submissionsService.getMySubmissions(req.user!.id);
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});

submissionsRouter.get("/stats", requireRole("MENTOR"), async (_req, res, next) => {
  try {
    const stats = await submissionsService.getStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

submissionsRouter.get("/", requireRole("MENTOR"), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await submissionsService.listSubmissions(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

submissionsRouter.patch(
  "/:id/status",
  requireRole("MENTOR"),
  validateBody(updateStatusSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const submission = await submissionsService.updateStatus(id, req.body.status);
      res.json({ submission });
    } catch (err) {
      next(err);
    }
  },
);
