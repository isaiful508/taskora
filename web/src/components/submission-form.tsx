"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { submissionFormSchema, type SubmissionFormValues } from "@/lib/validation";

interface SubmissionFormProps {
  lockedReason?: string | null;
}

export function SubmissionForm({ lockedReason = null }: SubmissionFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: { projectName: "", repoUrl: "", liveUrl: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: api.submissions.create,
    onSuccess: () => {
      toast.success("Project submitted", {
        description: "A mentor will review it shortly.",
      });
      reset();
      void queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const fields: (keyof SubmissionFormValues)[] = [
          "projectName",
          "repoUrl",
          "liveUrl",
          "description",
        ];
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const target = fields.find((candidate) => candidate === field);
          if (target && messages.length > 0) {
            setError(target, { message: messages[0] });
          }
        }
        toast.error(error.message);
        return;
      }
      toast.error("Something went wrong while submitting. Please try again.");
    },
  });

  const onSubmit = (values: SubmissionFormValues) =>
    mutation.mutate({ ...values, liveUrl: values.liveUrl || undefined });
  const isLocked = Boolean(lockedReason);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a project</CardTitle>
        <CardDescription>
          Share the repository, a live deployment (if you have one) and a short description of
          what you built.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLocked ? (
          <Alert className="mb-6">
            <AlertTitle>Submission limit reached</AlertTitle>
            <AlertDescription>{lockedReason}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="projectName">
              Project name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="projectName"
              placeholder="Campus Marketplace"
              disabled={isLocked}
              aria-invalid={Boolean(errors.projectName)}
              {...register("projectName")}
            />
            {errors.projectName ? (
              <p className="text-xs text-destructive">{errors.projectName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="repoUrl">
              Repository URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="repoUrl"
              type="url"
              placeholder="https://github.com/you/project"
              disabled={isLocked}
              aria-invalid={Boolean(errors.repoUrl)}
              {...register("repoUrl")}
            />
            {errors.repoUrl ? (
              <p className="text-xs text-destructive">{errors.repoUrl.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveUrl">
              Live link <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="liveUrl"
              type="url"
              placeholder="https://your-project.vercel.app"
              disabled={isLocked}
              aria-invalid={Boolean(errors.liveUrl)}
              {...register("liveUrl")}
            />
            {errors.liveUrl ? (
              <p className="text-xs text-destructive">{errors.liveUrl.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              rows={6}
              placeholder="What does the project do? Which stack did you use? What did you learn?"
              disabled={isLocked}
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Minimum 20 characters. Mention the problem you solved and your tech stack.
                </p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isLocked || isSubmitting || mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {mutation.isPending ? "Submitting…" : "Submit project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
