ALTER TYPE "SubmissionStatus" ADD VALUE 'NEEDS_REVISION';

ALTER TABLE "Submission"
ADD COLUMN "reviewFeedback" TEXT,
ADD COLUMN "functionalityScore" INTEGER,
ADD COLUMN "codeQualityScore" INTEGER,
ADD COLUMN "documentationScore" INTEGER,
ADD COLUMN "presentationScore" INTEGER,
ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "assignedMentorId" TEXT,
ADD COLUMN "previousSubmissionId" TEXT;

ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_assignedMentorId_fkey"
FOREIGN KEY ("assignedMentorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Submission_previousSubmissionId_fkey"
FOREIGN KEY ("previousSubmissionId") REFERENCES "Submission"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Submission_previousSubmissionId_key" UNIQUE ("previousSubmissionId"),
ADD CONSTRAINT "Submission_functionalityScore_check"
CHECK ("functionalityScore" IS NULL OR "functionalityScore" BETWEEN 1 AND 5),
ADD CONSTRAINT "Submission_codeQualityScore_check"
CHECK ("codeQualityScore" IS NULL OR "codeQualityScore" BETWEEN 1 AND 5),
ADD CONSTRAINT "Submission_documentationScore_check"
CHECK ("documentationScore" IS NULL OR "documentationScore" BETWEEN 1 AND 5),
ADD CONSTRAINT "Submission_presentationScore_check"
CHECK ("presentationScore" IS NULL OR "presentationScore" BETWEEN 1 AND 5);

CREATE INDEX "Submission_assignedMentorId_status_idx"
ON "Submission"("assignedMentorId", "status");
