"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FolderGit2, Globe } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MySubmissions() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: api.submissions.mine,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission history</CardTitle>
        <CardDescription>Every project you have sent for review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load your submissions.</p>
        ) : !data || data.submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t submitted anything yet. Your first submission will show up here.
          </p>
        ) : (
          data.submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-medium leading-tight">{submission.projectName}</h3>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={submission.status} />
                  {submission.isLate ? <Badge variant="destructive">Late</Badge> : null}
                </div>
              </div>

              <p className="mt-2 line-clamp-3 text-muted-foreground">{submission.description}</p>
              {submission.previousSubmission ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Revision of {submission.previousSubmission.projectName}
                </p>
              ) : null}
              {submission.reviewFeedback ? (
                <div className="mt-3 rounded-md bg-muted/70 p-3">
                  <p className="text-xs font-semibold">Mentor feedback</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                    {submission.reviewFeedback}
                  </p>
                  {submission.functionalityScore !== null &&
                  submission.codeQualityScore !== null &&
                  submission.documentationScore !== null &&
                  submission.presentationScore !== null ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Rubric (1–5): Functionality {submission.functionalityScore} · Code quality{" "}
                      {submission.codeQualityScore} · Documentation {submission.documentationScore} ·
                      Presentation {submission.presentationScore}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span>Submitted {formatDate(submission.createdAt)}</span>
                <a
                  href={submission.repoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <FolderGit2 className="size-3.5" aria-hidden />
                  Repository
                  <ExternalLink className="size-3" aria-hidden />
                </a>
                {submission.liveUrl ? (
                  <a
                    href={submission.liveUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Globe className="size-3.5" aria-hidden />
                    Live site
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : null}
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
