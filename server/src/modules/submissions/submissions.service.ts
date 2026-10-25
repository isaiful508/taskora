import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/error";
import type { CreateSubmissionInput, ListQuery } from "./submissions.schema";

const studentSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

export async function createSubmission(studentId: string, input: CreateSubmissionInput) {
  const active = await prisma.submission.findFirst({
    where: {
      studentId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (active) {
    throw ApiError.conflict(
      active.status === "APPROVED"
        ? "You already have an approved submission"
        : "You already have a pending submission. Please wait for a mentor to review it.",
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
      },
      include: { student: { select: studentSelect } },
    });
  } catch (err) {
    // Race-safe fallback: the partial unique index rejects concurrent active submissions.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("You already have an active submission");
    }
    throw err;
  }
}

export async function getMySubmissions(studentId: string) {
  return prisma.submission.findMany({
    where: { studentId },
    include: { student: { select: studentSelect } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listSubmissions(query: ListQuery) {
  const where: Prisma.SubmissionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
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
      include: { student: { select: studentSelect } },
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

  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
  }

  return {
    total: counts.PENDING + counts.APPROVED + counts.REJECTED,
    pending: counts.PENDING,
    approved: counts.APPROVED,
    rejected: counts.REJECTED,
  };
}

export async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
  const existing = await prisma.submission.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound("Submission not found");
  }

  return prisma.submission.update({
    where: { id },
    data: { status },
    include: { student: { select: studentSelect } },
  });
}
