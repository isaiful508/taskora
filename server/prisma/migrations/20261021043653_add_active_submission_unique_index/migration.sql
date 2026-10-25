-- A student can have at most one active (PENDING or APPROVED) submission at a time.
-- This partial unique index makes the business rule race-proof at the database level.
CREATE UNIQUE INDEX "Submission_studentId_active_key"
ON "Submission"("studentId")
WHERE "status" IN ('PENDING', 'APPROVED');
