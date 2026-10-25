"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, Clock3, Layers3, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/full-page-loader";
import { MySubmissions } from "@/components/my-submissions";
import { SubmissionForm } from "@/components/submission-form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";

export default function StudentDashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: api.submissions.mine,
    enabled: status === "authenticated",
  });
  const {
    data: submissionConfig,
    isError: submissionConfigError,
    refetch: refetchSubmissionConfig,
  } = useQuery({
    queryKey: ["submission-config"],
    queryFn: api.submissions.config,
  });

  useEffect(() => {
    if (status === "authenticated" && user?.role === "MENTOR") {
      router.replace("/dashboard/mentor");
    }
  }, [status, user, router]);

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  if (status !== "authenticated" || !user) {
    return <FullPageLoader label="Loading your dashboard" />;
  }

  const submissions = data?.submissions ?? [];
  const active = submissions.find((s) => s.status === "PENDING" || s.status === "APPROVED");
  const revisionRequested = submissions.find(
    (submission) =>
      submission.status === "NEEDS_REVISION" &&
      !submissions.some((candidate) => candidate.previousSubmissionId === submission.id),
  );
  const deadline = submissionConfig?.deadline ? new Date(submissionConfig.deadline) : null;
  const deadlinePassed = deadline !== null && now !== null && now > deadline.getTime();

  const lockedReason = active
    ? active.status === "PENDING"
      ? "You already have a project awaiting review. You can submit a new one once it is approved or rejected."
      : "One of your projects was approved, so no further submissions are needed."
    : deadlinePassed && !submissionConfig?.allowLateSubmissions
      ? "The submission deadline has passed. New submissions are closed."
      : null;

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-7 shadow-sm sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              Student workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Make your next project count, {user.name.split(" ")[0]}.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Share what you built, get thoughtful feedback, and keep every review in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-2">
              <Layers3 className="size-3.5 text-primary" aria-hidden />
              One clear project
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-2">
              <Clock3 className="size-3.5 text-primary" aria-hidden />
              Mentor reviewed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-2">
              <BadgeCheck className="size-3.5 text-primary" aria-hidden />
              Status tracked
            </span>
          </div>
        </div>
      </section>

      {submissionConfigError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the submission deadline</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Deadline information is unavailable. The server still enforces its submission policy.</span>
            <button
              type="button"
              className="font-medium underline underline-offset-4"
              onClick={() => void refetchSubmissionConfig()}
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {submissionConfig?.deadline ? (
        <Alert variant={deadlinePassed ? "destructive" : "default"}>
          <AlertTitle>{deadlinePassed ? "Submission deadline passed" : "Submission deadline"}</AlertTitle>
          <AlertDescription>
            {deadline?.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {deadlinePassed && submissionConfig.allowLateSubmissions
              ? " — late submissions are still accepted and will be marked late."
              : deadlinePassed
                ? " — submissions are now closed."
                : " — submit before this time to avoid a late label."}
          </AlertDescription>
        </Alert>
      ) : null}

      {revisionRequested ? (
        <Alert>
          <AlertTitle>Revision requested — update and resubmit</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              A mentor left feedback on “{revisionRequested.projectName}”. The project details are
              prefilled below; edit the fields you changed and resubmit.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                document.getElementById("submission-form")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Update and resubmit
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SubmissionForm lockedReason={lockedReason} revision={revisionRequested} />
        </div>
        <div className="lg:col-span-2">
          {isPending ? (
            <FullPageLoader label="Loading submissions" />
          ) : (
            <MySubmissions />
          )}
        </div>
      </div>
    </div>
  );
}
