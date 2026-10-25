DROP INDEX "Submission_studentId_active_key";

CREATE UNIQUE INDEX "Submission_studentId_active_key"
ON "Submission"("studentId")
WHERE "status" = 'PENDING';
