"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, FolderGit2, Globe, Search, Sparkles, X, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatsCards } from "@/components/stats-cards";
import { StatusBadge } from "@/components/status-badge";
import { TablePagination } from "@/components/table-pagination";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, ApiError } from "@/lib/api";
import { reviewFormSchema } from "@/lib/validation";
import type { ReviewInput, Submission, SubmissionSort, SubmissionStatus } from "@/lib/types";

type StatusFilter = SubmissionStatus | "ALL";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NEEDS_REVISION", label: "Needs revision" },
];

const PAGE_SIZES = [10, 20, 50];

const SORT_OPTIONS: { value: SubmissionSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

const RUBRIC_FIELDS = [
  ["functionalityScore", "Functionality"],
  ["codeQualityScore", "Code quality"],
  ["documentationScore", "Documentation"],
  ["presentationScore", "Presentation"],
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReviewDashboard() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SubmissionSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [assignedFilter, setAssignedFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [confirm, setConfirm] = useState<{ submission: Submission; status: ReviewInput["status"] } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [scores, setScores] = useState({
    functionalityScore: 3,
    codeQualityScore: 3,
    documentationScore: 3,
    presentationScore: 3,
  });

  const search = useDebouncedValue(searchInput, 350);

  // Changing a filter resets the page: the previous offset no longer points at
  // the same result set, and the user expects to land on the first page.
  function changeStatus(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function changeSort(value: SubmissionSort) {
    setSort(value);
    setPage(1);
  }

  function changeLimit(value: number) {
    setLimit(value);
    setPage(1);
  }

  function changeSearch(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  const submissionsQuery = useQuery({
    queryKey: ["submissions", statusFilter, search, sort, assignedFilter, page, limit],
    queryFn: () =>
      api.submissions.list({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined,
        sort,
        assigned: assignedFilter,
        page,
        limit,
      }),
    placeholderData: (previous) => previous,
  });

  const mentorsQuery = useQuery({
    queryKey: ["mentor-workload"],
    queryFn: api.submissions.mentors,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, review }: { id: string; review: ReviewInput }) =>
      api.submissions.updateStatus(id, review),
    onSuccess: ({ submission }) => {
      const message = submission.status === "NEEDS_REVISION"
        ? "Revision requested"
        : submission.status === "APPROVED"
          ? "Project approved"
          : "Project rejected";
      toast.success(message, { description: submission.projectName });
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update the review status.",
      );
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: ({ id, mentorId }: { id: string; mentorId: string | null }) =>
      api.submissions.assign(id, mentorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["mentor-workload"] });
      toast.success("Review assignment updated");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Could not update the assignment.");
    },
  });

  function openReviewDialog(submission: Submission, status: ReviewInput["status"]) {
    setFeedback(submission.reviewFeedback ?? "");
    setScores({
      functionalityScore: submission.functionalityScore ?? 3,
      codeQualityScore: submission.codeQualityScore ?? 3,
      documentationScore: submission.documentationScore ?? 3,
      presentationScore: submission.presentationScore ?? 3,
    });
    setConfirm({ submission, status });
  }

  const rows = submissionsQuery.data?.data ?? [];
  const meta = submissionsQuery.data?.meta;

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-7 shadow-sm sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:grid">
            <ClipboardCheck className="size-7" aria-hidden />
          </div>
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              Mentor workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Help great ideas move forward.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Review student projects, share a clear decision, and help each builder take their
              next step.
            </p>
          </div>
        </div>
      </section>

      <StatsCards />

      <Card>
        <CardHeader>
          <CardTitle>Mentor workload</CardTitle>
          <CardDescription>Assigned submissions and projects still awaiting a decision.</CardDescription>
        </CardHeader>
        <CardContent>
          {mentorsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load mentor workloads</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>Try loading the workload summary again.</span>
                <Button size="sm" variant="outline" onClick={() => void mentorsQuery.refetch()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : mentorsQuery.isPending ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mentorsQuery.data?.mentors.map((mentor) => (
                <div key={mentor.id} className="rounded-lg border p-3">
                  <p className="font-medium">{mentor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {mentor.pending} pending · {mentor.totalAssigned} assigned total
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Submission queue</CardTitle>
              <CardDescription className="mt-1">
                Review work from the community and make each decision count.
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" aria-hidden />
              Review queue
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={searchInput}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Search project or student…"
                aria-label="Search submissions"
                className="pl-8"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => changeSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => changeStatus(value as StatusFilter)}
              >
                <SelectTrigger aria-label="Filter by status" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={assignedFilter}
                onValueChange={(value) => {
                  setAssignedFilter(value as typeof assignedFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filter by assignment" className="w-[145px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignments</SelectItem>
                  <SelectItem value="mine">Assigned to me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>

              <Select value={String(limit)} onValueChange={(value) => changeLimit(Number(value))}>
                <SelectTrigger aria-label="Rows per page" className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sort}
                onValueChange={(value) => changeSort(value as SubmissionSort)}
              >
                <SelectTrigger aria-label="Sort submissions" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border">
            {submissionsQuery.isError ? (
              <Alert variant="destructive" className="m-3">
                <AlertTitle>Could not load submissions</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>Please check your connection and try again.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void submissionsQuery.refetch()}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Project</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-[110px]">Links</TableHead>
                  <TableHead className="min-w-[160px]">Assigned mentor</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Submitted</TableHead>
                  <TableHead className="w-[190px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissionsQuery.isPending ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 && submissionsQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                      Submission data is unavailable.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No submissions match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium leading-tight">{submission.projectName}</p>
                          {submission.isLate ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300">
                              Late
                            </span>
                          ) : null}
                          {submission.previousSubmissionId ? (
                            <Badge variant="secondary" title="Student resubmitted after a revision request">
                              Resubmitted
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 max-w-md text-xs text-muted-foreground">
                          {submission.description}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="text-sm font-medium">{submission.student.name}</p>
                        <p className="text-xs text-muted-foreground">{submission.student.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={submission.repoUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                aria-label="Open repository"
                                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <FolderGit2 className="size-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Repository</TooltipContent>
                          </Tooltip>

                          {submission.liveUrl ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={submission.liveUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  aria-label="Open live site"
                                  className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  <Globe className="size-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Live site</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={submission.assignedMentorId ?? "unassigned"}
                          onValueChange={(value) =>
                            assignmentMutation.mutate({
                              id: submission.id,
                              mentorId: value === "unassigned" ? null : value,
                            })
                          }
                          disabled={assignmentMutation.isPending}
                        >
                          <SelectTrigger aria-label={`Assign ${submission.projectName}`} className="w-[150px]">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {mentorsQuery.data?.mentors.map((mentor) => (
                              <SelectItem key={mentor.id} value={mentor.id}>
                                {mentor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(submission.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submission.status === "APPROVED"}
                            onClick={() => openReviewDialog(submission, "APPROVED")}
                          >
                            <Check className="size-4 text-emerald-600" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submission.status === "NEEDS_REVISION"}
                            onClick={() => openReviewDialog(submission, "NEEDS_REVISION")}
                          >
                            <RotateCcw className="size-4 text-blue-600" />
                            Revise
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submission.status === "REJECTED"}
                            onClick={() => openReviewDialog(submission, "REJECTED")}
                          >
                            <X className="size-4 text-red-600" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta ? (
            <TablePagination meta={meta} onPageChange={setPage} />
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.status === "APPROVED"
                ? "Approve this project?"
                : confirm?.status === "NEEDS_REVISION"
                  ? "Request a revision?"
                  : "Reject this project?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.status === "APPROVED"
                ? `Review the rubric and add optional feedback for “${confirm.submission.projectName}”.`
                : confirm
                  ? `Review “${confirm.submission.projectName}”. Feedback is required; the student will see the rubric and can respond to the decision.`
                  : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-feedback">Feedback</Label>
              <Textarea
                id="review-feedback"
                rows={4}
                maxLength={2000}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Share specific strengths and next steps."
              />
              {confirm?.status !== "APPROVED" ? (
                <p className="text-xs text-muted-foreground">
                  At least 10 characters are required for this decision.
                </p>
              ) : null}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Project rubric (1–5)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {RUBRIC_FIELDS.map(([field, label]) => (
                  <label key={field} className="space-y-1 text-sm">
                    <span>{label}</span>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={scores[field]}
                      onChange={(event) =>
                        setScores((current) => ({ ...current, [field]: Number(event.target.value) }))
                      }
                    >
                      {[1, 2, 3, 4, 5].map((score) => (
                        <option key={score} value={score}>
                          {score} / 5
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant={confirm?.status === "REJECTED" ? "destructive" : "default"}
              disabled={statusMutation.isPending}
              onClick={() => {
                if (!confirm) return;
                const result = reviewFormSchema.safeParse({
                  status: confirm.status,
                  feedback,
                  ...scores,
                });
                if (!result.success) {
                  toast.error(result.error.issues[0]?.message ?? "Please check the review details.");
                  return;
                }
                statusMutation.mutate({
                  id: confirm.submission.id,
                  review: result.data,
                });
              }}
            >
              {statusMutation.isPending
                ? "Saving review…"
                : confirm?.status === "APPROVED"
                  ? "Approve project"
                  : confirm?.status === "NEEDS_REVISION"
                    ? "Request revision"
                    : "Reject project"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
