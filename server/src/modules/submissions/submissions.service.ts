import { Prisma } from "../../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error.js";
import {
  type CreateSubmissionInput,
  type ListQuery,
  type UpdateStatusInput,
} from "./submissions.schema.js";

const studentSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

const mentorSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

const submissionRelations = {
  student: { select: studentSelect },
  assignedMentor: { select: mentorSelect },
} satisfies Prisma.SubmissionInclude;

export async function createSubmission(studentId: string, input: CreateSubmissionInput) {
  const deadline = env.SUBMISSION_DEADLINE ? new Date(env.SUBMISSION_DEADLINE) : null;
  const now = new Date();
  if (deadline && now > deadline && !env.ALLOW_LATE_SUBMISSIONS) {
    throw ApiError.conflict("The submission deadline has passed");
  }

  const active = await prisma.submission.findFirst({
    where: {
      studentId,
      status: "PENDING",
    },
  });

  if (active) {
    throw ApiError.conflict("You already have a pending submission. Please wait for a mentor to review it.");
  }

  const existingSubmissions = await prisma.submission.findMany({
    where: { studentId },
    select: {
      id: true,
      projectName: true,
      repoUrl: true,
      liveUrl: true,
      previousSubmissionId: true,
      status: true,
    },
  });
  const submissionsById = new Map(
    existingSubmissions.map((submission) => [submission.id, submission]),
  );
  const revisionLineage = new Set<string>();

  if (input.previousSubmissionId) {
    const revision = submissionsById.get(input.previousSubmissionId);
    const hasAlreadyBeenRevised = existingSubmissions.some(
      (submission) => submission.previousSubmissionId === input.previousSubmissionId,
    );
    if (!revision || revision.status !== "NEEDS_REVISION" || hasAlreadyBeenRevised) {
      throw ApiError.conflict("This revision request is no longer available for resubmission");
    }

    let current: typeof revision | undefined = revision;
    while (current && !revisionLineage.has(current.id)) {
      revisionLineage.add(current.id);
      current = current.previousSubmissionId
        ? submissionsById.get(current.previousSubmissionId)
        : undefined;
    }
  }

  const normalizeProjectName = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const normalizeUrl = (value: string, repository = false) => {
    const url = new URL(value);
    let path = url.pathname.replace(/\/+$/, "");
    if (repository) {
      path = path.replace(/\.git$/i, "").toLowerCase();
    }
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${path}`;
  };
  const candidates = existingSubmissions.filter(
    (submission) => !revisionLineage.has(submission.id),
  );
  const duplicateErrors: Record<string, string[]> = {};
  const submittedLiveUrl = input.liveUrl ? normalizeUrl(input.liveUrl) : null;

  if (
    candidates.some(
      (submission) =>
        normalizeProjectName(submission.projectName) === normalizeProjectName(input.projectName),
    )
  ) {
    duplicateErrors.projectName = [
      "You have already submitted a project with this name. Use that project's revision action to update it.",
    ];
  }
  if (
    candidates.some(
      (submission) => normalizeUrl(submission.repoUrl, true) === normalizeUrl(input.repoUrl, true),
    )
  ) {
    duplicateErrors.repoUrl = [
      "This repository has already been submitted. Use the existing project's revision action instead of creating a duplicate.",
    ];
  }
  if (
    submittedLiveUrl &&
    candidates.some(
      (submission) =>
        submission.liveUrl && normalizeUrl(submission.liveUrl) === submittedLiveUrl,
    )
  ) {
    duplicateErrors.liveUrl = [
      "This live link has already been submitted for another project.",
    ];
  }
  if (Object.keys(duplicateErrors).length > 0) {
    throw ApiError.conflict(
      "This submission matches a project already in your history. Review the highlighted fields, or use the existing project's revision action.",
      duplicateErrors,
    );
  }

  try {
    return await prisma.submission.create({
      data: {
        studentId,
        projectName: input.projectName,
        repoUrl: input.repoUrl,
        liveUrl: input.liveUrl || null,
        description: input.description,
        isLate: Boolean(deadline && now > deadline),
        ...(input.previousSubmissionId ? { previousSubmissionId: input.previousSubmissionId } : {}),
      },
      include: submissionRelations,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("You already have a pending submission or this revision was submitted");
    }
    throw err;
  }
}

export async function getMySubmissions(studentId: string) {
  return prisma.submission.findMany({
    where: { studentId },
    include: {
      ...submissionRelations,
      previousSubmission: {
        select: {
          id: true,
          projectName: true,
          reviewFeedback: true,
          functionalityScore: true,
          codeQualityScore: true,
          documentationScore: true,
          presentationScore: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteMySubmission(studentId: string, submissionId: string) {
  const result = await prisma.submission.deleteMany({
    where: { id: submissionId, studentId },
  });

  if (result.count === 0) {
    throw ApiError.notFound("Submission not found");
  }
}

export async function listSubmissions(query: ListQuery, mentorId: string) {
  const where: Prisma.SubmissionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.assigned === "mine"
      ? { assignedMentorId: mentorId }
      : query.assigned === "unassigned"
        ? { assignedMentorId: null }
        : {}),
    ...(query.search
      ? {
          OR: [
            { projectName: { contains: query.search, mode: "insensitive" } },
            { student: { name: { contains: query.search, mode: "insensitive" } } },
            { student: { email: { contains: query.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.SubmissionOrderByWithRelationInput =
    query.sort === "oldest"
      ? { createdAt: "asc" }
      : query.sort === "name"
        ? { projectName: "asc" }
        : { createdAt: "desc" };

  const [data, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: submissionRelations,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getStats() {
  const grouped = await prisma.submission.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, NEEDS_REVISION: 0 };
  for (const group of grouped) {
    counts[group.status] = group._count._all;
  }

  return {
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    pending: counts.PENDING,
    approved: counts.APPROVED,
    rejected: counts.REJECTED,
    needsRevision: counts.NEEDS_REVISION,
  };
}

export async function updateStatus(id: string, review: UpdateStatusInput) {
  const existing = await prisma.submission.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound("Submission not found");
  }

  try {
    return await prisma.submission.update({
      where: { id },
      data: {
        status: review.status,
        reviewFeedback: review.feedback?.trim() || null,
        functionalityScore: review.functionalityScore,
        codeQualityScore: review.codeQualityScore,
        documentationScore: review.documentationScore,
        presentationScore: review.presentationScore,
      },
      include: submissionRelations,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("This student already has another active submission");
    }
    throw err;
  }
}

export async function updateAssignment(id: string, mentorId: string | null) {
  const existing = await prisma.submission.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw ApiError.notFound("Submission not found");
  }

  if (mentorId) {
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: "MENTOR" },
      select: { id: true },
    });
    if (!mentor) {
      throw ApiError.badRequest("Choose a valid mentor");
    }
  }

  return prisma.submission.update({
    where: { id },
    data: { assignedMentorId: mentorId },
    include: submissionRelations,
  });
}

export async function getMentorWorkload() {
  const [mentors, totals, pending] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MENTOR" },
      select: mentorSelect,
      orderBy: { name: "asc" },
    }),
    prisma.submission.groupBy({
      by: ["assignedMentorId"],
      where: { assignedMentorId: { not: null } },
      _count: { _all: true },
    }),
    prisma.submission.groupBy({
      by: ["assignedMentorId"],
      where: { assignedMentorId: { not: null }, status: "PENDING" },
      _count: { _all: true },
    }),
  ]);

  const totalByMentor = new Map(totals.map(({ assignedMentorId, _count }) => [
    assignedMentorId!,
    _count._all,
  ]));
  const pendingByMentor = new Map(pending.map(({ assignedMentorId, _count }) => [
    assignedMentorId!,
    _count._all,
  ]));

  return mentors.map((mentor) => ({
    ...mentor,
    totalAssigned: totalByMentor.get(mentor.id) ?? 0,
    pending: pendingByMentor.get(mentor.id) ?? 0,
  }));
}
