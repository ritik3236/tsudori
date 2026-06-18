-- TSU: fee payment reversals (audit-safe, no row deletion).
-- A reversal is a FeePayment row with a negative amount linked to the original via
-- reversalOfId; balances are SUM(amount) so it nets the original out. Reversal rows
-- carry no receipt number, so receiptNo becomes nullable (the unique constraint
-- already permits multiple NULLs in Postgres).
-- Idempotent: safe to re-run if a prior apply partially failed.
ALTER TABLE public."FeePayment" ALTER COLUMN "receiptNo" DROP NOT NULL;

ALTER TABLE public."FeePayment" ADD COLUMN IF NOT EXISTS "reversalOfId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FeePayment_reversalOfId_fkey'
  ) THEN
    ALTER TABLE public."FeePayment"
      ADD CONSTRAINT "FeePayment_reversalOfId_fkey"
      FOREIGN KEY ("reversalOfId") REFERENCES public."FeePayment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FeePayment_reversalOfId_idx"
  ON public."FeePayment"("reversalOfId");
