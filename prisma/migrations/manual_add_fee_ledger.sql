-- Fee catalog & ledger: Course → Enrollment → FeeCharge.
--
-- Phase 0 (additive) of the fee-architecture refactor. Introduces the Course
-- catalog, first-class Enrollment, and the immutable FeeCharge ledger, plus the
-- enrolment/charge links on FeePayment & FeeWaiver and Class.courseId. Nothing is
-- dropped — the app keeps reading Student.monthlyFee until the cutover phase.
--
-- Tables live in `public`; instituteId FKs cross to public."Institute". Hand-applied
-- per project policy — NOT via `prisma migrate dev`. Idempotent: safe to re-run.
--
-- FIRST of THREE additive migrations for this refactor — apply in order:
--   1. manual_add_fee_ledger.sql                  (this file)
--   2. manual_add_enrollment_discount_percent.sql (Enrollment.discountPercent)
--   3. manual_add_course_bundles.sql              (Course.isBundle + CourseBundleItem)
-- Together they match the current Prisma schema; applying only this one leaves the
-- DB missing columns/tables the app reads (course management + fee reads will 500).
--
-- Applied to: sandbox (br-rough-bar-ao4vfp5e / ep-square-bar) and prod
-- (br-solitary-snow-aoi1buu9 / ep-sweet-unit), both 2026-06-26.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public."CourseStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."ChargeType" AS ENUM ('TUITION', 'ONE_TIME');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."Course" (
  "id"             TEXT PRIMARY KEY,
  "instituteId"    TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "nameKey"        TEXT NOT NULL,
  "durationMonths" INTEGER NOT NULL,
  "monthlyFee"     DECIMAL(10,2) NOT NULL,
  "status"         public."CourseStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."CourseFeeComponent" (
  "id"        TEXT PRIMARY KEY,
  "courseId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "amount"    DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."Enrollment" (
  "id"          TEXT PRIMARY KEY,
  "instituteId" TEXT NOT NULL,
  "studentId"   TEXT NOT NULL,
  "courseId"    TEXT NOT NULL,
  "startDate"   TIMESTAMPTZ(3) NOT NULL,
  "feeOverride" DECIMAL(10,2),
  "status"      public."EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."FeeCharge" (
  "id"           TEXT PRIMARY KEY,
  "instituteId"  TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "studentId"    TEXT NOT NULL,
  "type"         public."ChargeType" NOT NULL DEFAULT 'TUITION',
  "label"        TEXT,
  "periodMonth"  INTEGER,
  "periodYear"   INTEGER,
  "amount"       DECIMAL(10,2) NOT NULL,
  "dueDate"      TIMESTAMPTZ(3) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── New columns on existing tables ───────────────────────────────────────────
ALTER TABLE public."Class"      ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public."FeePayment" ADD COLUMN IF NOT EXISTS "enrollmentId" TEXT;
ALTER TABLE public."FeePayment" ADD COLUMN IF NOT EXISTS "chargeId" TEXT;
ALTER TABLE public."FeeWaiver"  ADD COLUMN IF NOT EXISTS "enrollmentId" TEXT;
ALTER TABLE public."FeeWaiver"  ADD COLUMN IF NOT EXISTS "chargeId" TEXT;

-- ── Indexes & unique constraints ─────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "Course_instituteId_nameKey_key" ON public."Course" ("instituteId", "nameKey");
CREATE INDEX IF NOT EXISTS "Course_instituteId_status_idx" ON public."Course" ("instituteId", "status");
CREATE INDEX IF NOT EXISTS "CourseFeeComponent_courseId_idx" ON public."CourseFeeComponent" ("courseId");
CREATE INDEX IF NOT EXISTS "Enrollment_instituteId_studentId_idx" ON public."Enrollment" ("instituteId", "studentId");
CREATE INDEX IF NOT EXISTS "Enrollment_courseId_idx" ON public."Enrollment" ("courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "FeeCharge_enrollmentId_type_periodYear_periodMonth_key" ON public."FeeCharge" ("enrollmentId", "type", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "FeeCharge_instituteId_studentId_idx" ON public."FeeCharge" ("instituteId", "studentId");
CREATE INDEX IF NOT EXISTS "FeeCharge_enrollmentId_idx" ON public."FeeCharge" ("enrollmentId");
CREATE INDEX IF NOT EXISTS "Class_courseId_idx" ON public."Class" ("courseId");
CREATE INDEX IF NOT EXISTS "FeePayment_enrollmentId_idx" ON public."FeePayment" ("enrollmentId");
CREATE INDEX IF NOT EXISTS "FeePayment_chargeId_idx" ON public."FeePayment" ("chargeId");
CREATE INDEX IF NOT EXISTS "FeeWaiver_enrollmentId_idx" ON public."FeeWaiver" ("enrollmentId");
CREATE INDEX IF NOT EXISTS "FeeWaiver_chargeId_idx" ON public."FeeWaiver" ("chargeId");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public."Course" ADD CONSTRAINT "Course_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES public."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."CourseFeeComponent" ADD CONSTRAINT "CourseFeeComponent_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES public."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."Enrollment" ADD CONSTRAINT "Enrollment_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES public."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES public."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeeCharge" ADD CONSTRAINT "FeeCharge_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES public."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeeCharge" ADD CONSTRAINT "FeeCharge_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES public."Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeeCharge" ADD CONSTRAINT "FeeCharge_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."Class" ADD CONSTRAINT "Class_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES public."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeePayment" ADD CONSTRAINT "FeePayment_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES public."Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeePayment" ADD CONSTRAINT "FeePayment_chargeId_fkey"
    FOREIGN KEY ("chargeId") REFERENCES public."FeeCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeeWaiver" ADD CONSTRAINT "FeeWaiver_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES public."Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeeWaiver" ADD CONSTRAINT "FeeWaiver_chargeId_fkey"
    FOREIGN KEY ("chargeId") REFERENCES public."FeeCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
