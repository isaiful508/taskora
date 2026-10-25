import { z } from "zod";

const httpUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(500, "URL is too long")
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  });

export const submissionFormSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be at most 100 characters"),
  repoUrl: httpUrl,
  liveUrl: z.union([httpUrl, z.literal("")]).optional(),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
});

export const signupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;
export type SignupFormValues = z.infer<typeof signupFormSchema>;
export type LoginFormValues = z.infer<typeof loginFormSchema>;
