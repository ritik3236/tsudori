-- Enrolment percentage scholarships.
--
-- Adds Enrollment.discountPercent — the % alternative to the fixed feeOverride.
-- At most one of the two is set (enforced in the app). Additive + nullable, so
-- safe on existing rows. Hand-applied per project policy.
--
-- Part 2 of 3 for this refactor — apply after manual_add_fee_ledger.sql and before
-- manual_add_course_bundles.sql.
--
-- Applied to: sandbox (br-rough-bar-ao4vfp5e / ep-square-bar) and prod
-- (br-solitary-snow-aoi1buu9 / ep-sweet-unit), both 2026-06-26.

ALTER TABLE public."Enrollment" ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(5,2);
