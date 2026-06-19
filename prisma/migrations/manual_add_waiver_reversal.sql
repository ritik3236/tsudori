-- Fee waiver reversal: a reversal row (negative amount) undoes a concession
-- without deleting history, mirroring FeePayment reversals.
--
-- Adds a nullable self-FK on FeeWaiver. Hand-applied per project policy — NOT via
-- `prisma migrate dev`. Idempotent: safe to re-run on any branch.
--
-- Applied to: sandbox (br-rough-bar-ao4vfp5e / ep-square-bar) and prod
-- (br-solitary-snow-aoi1buu9 / ep-sweet-unit).

ALTER TABLE public."FeeWaiver" ADD COLUMN IF NOT EXISTS "reversalOfId" TEXT;

CREATE INDEX IF NOT EXISTS "FeeWaiver_reversalOfId_idx" ON public."FeeWaiver" ("reversalOfId");

DO $$ BEGIN
  ALTER TABLE public."FeeWaiver"
    ADD CONSTRAINT "FeeWaiver_reversalOfId_fkey"
    FOREIGN KEY ("reversalOfId") REFERENCES public."FeeWaiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
