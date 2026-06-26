-- Phase 5 cleanup: drop the legacy fee columns, now fully superseded by the
-- Course → Enrollment → FeeCharge ledger.
--
-- As of TSU-105 + this change, NO code reads or writes Student.monthlyFee or
-- Class.defaultMonthlyFee — a student's monthly fee is the sum of their active
-- enrolments' effectiveFee (course rate / override / % discount). Both values are
-- derivable from the ledger, so the drop loses no irreplaceable data. Idempotent.
--
-- Apply AFTER deploying the code that stops referencing these columns; restart the
-- dev server so the running Prisma client matches.
--
-- Applied to: sandbox (br-rough-bar-ao4vfp5e) and prod (br-solitary-snow-aoi1buu9),
-- both 2026-06-27.

ALTER TABLE public."Student" DROP COLUMN IF EXISTS "monthlyFee";
ALTER TABLE public."Class" DROP COLUMN IF EXISTS "defaultMonthlyFee";
