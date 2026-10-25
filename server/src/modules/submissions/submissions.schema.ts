import { z } from "zod";

const httpUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  });

export const createSubmissionSchema = z.object({
  projectName: z.string().trim().min(3, "Project name must be at least 3 characters").max(100),
  repoUrl: httpUrl.max(500),
  liveUrl: httpUrl.max(500).optional().or(z.literal("").transform(() => undefined)),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
});

export const updateStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "NEEDS_REVISION"], {
    error: "Status must be APPROVED, REJECTED, or NEEDS_REVISION",
  }),
  feedback: z.string().trim().max(2000).optional().or(z.literal("")),
  functionalityScore: z.number().int().min(1).max(5),
  codeQualityScore: z.number().int().min(1).max(5),
  documentationScore: z.number().int().min(1).max(5),
  presentationScore: z.number().int().min(1).max(5),
}).superRefine((value, ctx) => {
  if (value.status !== "APPROVED" && (value.feedback?.trim().length ?? 0) < 10) {
    ctx.addIssue({
      code: "custom",
      path: ["feedback"],
      message: "Provide at least 10 characters of feedback for this decision",
    });
  }
});

export const assignmentSchema = z.object({
  mentorId: z.string().cuid().nullable(),
});

export const listQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"]).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "oldest", "name"]).default("newest"),
  assigned: z.enum(["all", "mine", "unassigned"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
