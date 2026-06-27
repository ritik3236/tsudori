-- Student-level installments: a Student is billed MONTHLY (default, unchanged) or
-- INSTALLMENT — a per-student StudentInstallment schedule that replaces monthly
-- accrual. Each plan row materializes one immutable INSTALLMENT FeeCharge
-- (FeeCharge.studentInstallmentId, unique → idempotent re-mint even when two
-- installments share a due month).
--
-- Additive + NEW-only: existing students default to MONTHLY; NO data backfill.
--
-- APPLY ORDER — Postgres forbids USING a new enum value in the same txn that adds
-- it, so the ADD VALUE is a standalone auto-committed statement run FIRST:
--   Call 1  (plain run_sql, NOT a transaction):  the single ALTER TYPE ... ADD VALUE.
--   Call 2  (run_sql_transaction):               everything after the CALL 2 marker.
-- Apply to SANDBOX (ep-square-bar) first; re-run Call 2 to prove idempotency; then
-- `prisma generate` + restart dev. Prod (br-solitary-snow-aoi1buu9 / ep-sweet-unit)
-- only on push approval.

-- =========================== CALL 1 (standalone) ============================
ALTER TYPE public."ChargeType" ADD VALUE IF NOT EXISTS 'INSTALLMENT';

-- =========================== CALL 2 (transaction) ===========================
DO $$ BEGIN
  CREATE TYPE public."BillingMode" AS ENUM ('MONTHLY', 'INSTALLMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public."Student"
  ADD COLUMN IF NOT EXISTS "billingMode" public."BillingMode" NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE public."FeeCharge" ALTER COLUMN "enrollmentId" DROP NOT NULL;
ALTER TABLE public."FeeCharge" ADD COLUMN IF NOT EXISTS "studentInstallmentId" TEXT;

CREATE TABLE IF NOT EXISTS public."StudentInstallment" (
  "id"          TEXT           NOT NULL,
  "instituteId" TEXT           NOT NULL,
  "studentId"   TEXT           NOT NULL,
  "seq"         INTEGER        NOT NULL,
  "dueDate"     TIMESTAMPTZ(3) NOT NULL,
  "amount"      DECIMAL(10, 2) NOT NULL,
  "label"       TEXT,
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "StudentInstallment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentInstallment_studentId_seq_key"
  ON public."StudentInstallment" ("studentId", "seq");
CREATE INDEX IF NOT EXISTS "StudentInstallment_instituteId_studentId_idx"
  ON public."StudentInstallment" ("instituteId", "studentId");

CREATE UNIQUE INDEX IF NOT EXISTS "FeeCharge_studentInstallmentId_key"
  ON public."FeeCharge" ("studentInstallmentId");
CREATE INDEX IF NOT EXISTS "FeeCharge_instituteId_studentId_type_idx"
  ON public."FeeCharge" ("instituteId", "studentId", "type");

DO $$ BEGIN
  ALTER TABLE public."StudentInstallment"
    ADD CONSTRAINT "StudentInstallment_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES public."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."StudentInstallment"
    ADD CONSTRAINT "StudentInstallment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."FeeCharge"
    ADD CONSTRAINT "FeeCharge_studentInstallmentId_fkey"
    FOREIGN KEY ("studentInstallmentId") REFERENCES public."StudentInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
