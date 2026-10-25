"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BadgeCheck, Clock3, Layers3, Sparkles } from "lucide-react";
import { FullPageLoader } from "@/components/full-page-loader";
import { MySubmissions } from "@/components/my-submissions";
import { SubmissionForm } from "@/components/submission-form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";

export default function StudentDashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  const { data, isPending } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: api.submissions.mine,
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (status === "authenticated" && user?.role === "MENTOR") {
      router.replace("/dashboard/mentor");
    }
  }, [status, user, router]);

  if (status !== "authenticated" || !user) {
    return <FullPageLoader label="Loading your dashboard" />;
  }

  const submissions = data?.submissions ?? [];
  const active = submissions.find((s) => s.status === "PENDING" || s.status === "APPROVED");

  const lockedReason = active
    ? active.status === "PENDING"
      ? "You already have a project awaiting review. You can submit a new one once it is approved or rejected."
      : "One of your projects was approved, so no further submissions are needed."
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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SubmissionForm lockedReason={lockedReason} />
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
