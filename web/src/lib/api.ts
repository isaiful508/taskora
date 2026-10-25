import type {
  Paginated,
  Submission,
  SubmissionConfig,
  SubmissionFilters,
  SubmissionStats,
  MentorWorkload,
  ReviewInput,
  User,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors ?? {};
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;

  const url = new URL(`${API_BASE_URL}/api${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    ...rest,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (payload as { message?: string } | null)?.message ?? "Something went wrong. Please try again.";
    const fieldErrors = (payload as { errors?: Record<string, string[]> } | null)?.errors;
    throw new ApiError(res.status, message, fieldErrors);
  }

  return payload as T;
}

export const api = {
  auth: {
    signup: (input: { name: string; email: string; password: string }) =>
      request<{ user: User }>("/auth/signup", { method: "POST", body: input }),
    login: (input: { email: string; password: string }) =>
      request<{ user: User }>("/auth/login", { method: "POST", body: input }),
    logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
    me: () => request<{ user: User }>("/auth/me"),
  },
  submissions: {
    config: () => request<SubmissionConfig>("/submissions/config"),
    create: (input: {
      projectName: string;
      repoUrl: string;
      liveUrl?: string;
      description: string;
      previousSubmissionId?: string;
    }) => request<{ submission: Submission }>("/submissions", { method: "POST", body: input }),
    mine: () => request<{ submissions: Submission[] }>("/submissions/mine"),
    list: (filters: SubmissionFilters) =>
      request<Paginated<Submission>>("/submissions", {
        query: {
          status: filters.status,
          search: filters.search,
          sort: filters.sort,
          assigned: filters.assigned,
          page: filters.page,
          limit: filters.limit,
        },
      }),
    stats: () => request<{ stats: SubmissionStats }>("/submissions/stats"),
    mentors: () => request<{ mentors: MentorWorkload[] }>("/submissions/mentors"),
    updateStatus: (id: string, review: ReviewInput) =>
      request<{ submission: Submission }>(`/submissions/${id}/status`, {
        method: "PATCH",
        body: review,
      }),
    assign: (id: string, mentorId: string | null) =>
      request<{ submission: Submission }>(`/submissions/${id}/assignment`, {
        method: "PATCH",
        body: { mentorId },
      }),
  },
};
