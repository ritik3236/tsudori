-- TSU: Change @db.Date columns → TIMESTAMPTZ(3)
--
-- Attendance must be truncated because old records were stored at UTC midnight
-- (e.g. 2026-06-17T00:00:00Z) but new code stores IST midnight expressed in UTC
-- (e.g. 2026-06-16T18:30:00Z). The unique index on (studentId, date) would break
-- if mixed conventions were present.
--
-- Student admissionDate is display-only (no equality lookups), so existing data
-- converts cleanly: PostgreSQL casts DATE → TIMESTAMPTZ as UTC midnight, and
-- IST is UTC+5:30 so UTC midnight still shows the correct calendar date in IST.

TRUNCATE TABLE "Attendance";

ALTER TABLE "Student"
  ALTER COLUMN "admissionDate" TYPE TIMESTAMPTZ(3)
  USING "admissionDate"::timestamptz;

ALTER TABLE "Attendance"
  ALTER COLUMN "date" TYPE TIMESTAMPTZ(3)
  USING "date"::timestamptz;
