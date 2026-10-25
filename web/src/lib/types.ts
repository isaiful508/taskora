export type Role = "STUDENT" | "MENTOR";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
}

export interface Submission {
  id: string;
  studentId: string;
  projectName: string;
  repoUrl: string;
  liveUrl: string | null;
  description: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  student: StudentSummary;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export type SubmissionSort = "newest" | "oldest" | "name";

export interface SubmissionFilters {
  status?: SubmissionStatus;
  search?: string;
  sort?: SubmissionSort;
  page: number;
  limit: number;
}
