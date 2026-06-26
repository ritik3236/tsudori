-- Bundle courses: a course that packages other courses under one combined fee.
--
-- Adds Course.isBundle + a CourseBundleItem join (bundle → member courses).
-- Additive + safe on existing rows. Hand-applied per project policy.
--
-- Part 3 of 3 for this refactor — apply LAST, after manual_add_fee_ledger.sql and
-- manual_add_enrollment_discount_percent.sql.
--
-- Applied to: sandbox (br-rough-bar-ao4vfp5e / ep-square-bar) and prod
-- (br-solitary-snow-aoi1buu9 / ep-sweet-unit), both 2026-06-26.

ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS "isBundle" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public."CourseBundleItem" (
  "id"             TEXT PRIMARY KEY,
  "bundleCourseId" TEXT NOT NULL,
  "memberCourseId" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "CourseBundleItem_bundleCourseId_memberCourseId_key"
  ON public."CourseBundleItem" ("bundleCourseId", "memberCourseId");
CREATE INDEX IF NOT EXISTS "CourseBundleItem_bundleCourseId_idx" ON public."CourseBundleItem" ("bundleCourseId");
CREATE INDEX IF NOT EXISTS "CourseBundleItem_memberCourseId_idx" ON public."CourseBundleItem" ("memberCourseId");

DO $$ BEGIN
  ALTER TABLE public."CourseBundleItem" ADD CONSTRAINT "CourseBundleItem_bundleCourseId_fkey"
    FOREIGN KEY ("bundleCourseId") REFERENCES public."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."CourseBundleItem" ADD CONSTRAINT "CourseBundleItem_memberCourseId_fkey"
    FOREIGN KEY ("memberCourseId") REFERENCES public."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
