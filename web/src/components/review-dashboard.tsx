"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, FolderGit2, Globe, Search, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatsCards } from "@/components/stats-cards";
import { StatusBadge } from "@/components/status-badge";
import { TablePagination } from "@/components/table-pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { Submission, SubmissionSort, SubmissionStatus } from "@/lib/types";

type StatusFilter = SubmissionStatus | "ALL";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const PAGE_SIZES = [10, 20, 50];

const SORT_OPTIONS: { value: SubmissionSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

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
  const [confirm, setConfirm] = useState<{ submission: Submission; status: "APPROVED" | "REJECTED" } | null>(
    null,
  );

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
    queryKey: ["submissions", statusFilter, search, sort, page, limit],
    queryFn: () =>
      api.submissions.list({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined,
        sort,
        page,
        limit,
      }),
    placeholderData: (previous) => previous,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.submissions.updateStatus(id, status),
    onSuccess: ({ submission }) => {
      toast.success(
        submission.status === "APPROVED" ? "Project approved" : "Project rejected",
        { description: submission.projectName },
      );
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update the review status.",
      );
    },
  });

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
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Submitted</TableHead>
                  <TableHead className="w-[190px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissionsQuery.isPending ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 && submissionsQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      Submission data is unavailable.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No submissions match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium leading-tight">{submission.projectName}</p>
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
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(submission.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submission.status === "APPROVED"}
                            onClick={() => setConfirm({ submission, status: "APPROVED" })}
                          >
                            <Check className="size-4 text-emerald-600" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submission.status === "REJECTED"}
                            onClick={() => setConfirm({ submission, status: "REJECTED" })}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.status === "APPROVED" ? "Approve this project?" : "Reject this project?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.status === "APPROVED"
                ? `“${confirm.submission.projectName}” will be marked as approved and the student will see the updated status.`
                : confirm
                  ? `“${confirm.submission.projectName}” will be marked as rejected. The student can then submit a new project.`
                  : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.status === "APPROVED" ? "default" : "destructive"}
              disabled={statusMutation.isPending}
              onClick={() => {
                if (!confirm) return;
                statusMutation.mutate({ id: confirm.submission.id, status: confirm.status });
              }}
            >
              {confirm?.status === "APPROVED" ? "Approve project" : "Reject project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
