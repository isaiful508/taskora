export type Role = "STUDENT" | "MENTOR";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";

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
  reviewFeedback: string | null;
  functionalityScore: number | null;
  codeQualityScore: number | null;
  documentationScore: number | null;
  presentationScore: number | null;
  isLate: boolean;
  assignedMentorId: string | null;
  assignedMentor: UserSummary | null;
  previousSubmissionId: string | null;
  previousSubmission?: {
    id: string;
    projectName: string;
    reviewFeedback: string | null;
    functionalityScore: number | null;
    codeQualityScore: number | null;
    documentationScore: number | null;
    presentationScore: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  student: StudentSummary;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
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
  needsRevision: number;
}

export type SubmissionSort = "newest" | "oldest" | "name";

export interface SubmissionFilters {
  status?: SubmissionStatus;
  search?: string;
  sort?: SubmissionSort;
  assigned?: "all" | "mine" | "unassigned";
  page: number;
  limit: number;
}

export interface SubmissionConfig {
  deadline: string | null;
  allowLateSubmissions: boolean;
}

export interface MentorWorkload extends UserSummary {
  totalAssigned: number;
  pending: number;
}

export interface ReviewInput {
  status: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  feedback: string;
  functionalityScore: number;
  codeQualityScore: number;
  documentationScore: number;
  presentationScore: number;
}
