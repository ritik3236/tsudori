-- ────────────────────────────────────────────────────────────────────────────
-- Neon Auth identity migration
-- ────────────────────────────────────────────────────────────────────────────
-- Repoints the domain FKs from the old public."User" table (the Clerk mirror,
-- keyed by a cuid clerkUserId) to neon_auth."user" (Better Auth, uuid id).
--
-- This is hand-written rather than Prisma-generated because neon_auth."user" is
-- owned and managed by Neon Auth — Prisma must NOT create or alter it. The app's
-- schema models it as an external/unmigrated model (see prisma/schema.prisma).
--
-- DESTRUCTIVE — read before running:
--   • TRUNCATEs public."Membership". Old rows referenced Clerk user ids that no
--     longer exist; the bootstrap-admin flow re-creates the admin membership on
--     first sign-in (see src/lib/tenant.ts: maybeBootstrapAdmin).
--   • NULLs public."Attendance"."markedById" and public."FeePayment"."recordedById".
--     Those cuids referenced Clerk users that are gone; attribution is dropped,
--     the academic/financial records themselves are kept.
--   • DROPs public."User".
--
-- VALIDATE ON A NEON BRANCH FIRST. Do not run against production without a backup
-- branch / snapshot.
-- ────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Drop the FK constraints that reference public."User".
ALTER TABLE public."Membership" DROP CONSTRAINT IF EXISTS "Membership_userId_fkey";
ALTER TABLE public."Attendance" DROP CONSTRAINT IF EXISTS "Attendance_markedById_fkey";
ALTER TABLE public."FeePayment" DROP CONSTRAINT IF EXISTS "FeePayment_recordedById_fkey";

-- 2. Old memberships pointed at Clerk user ids — clear them (re-bootstrapped).
TRUNCATE public."Membership";

-- 3. Null historical attribution (cuid values cannot cast to uuid).
UPDATE public."Attendance" SET "markedById"   = NULL WHERE "markedById"   IS NOT NULL;
UPDATE public."FeePayment" SET "recordedById" = NULL WHERE "recordedById" IS NOT NULL;

-- 4. Convert the identity columns from text (cuid) to uuid. After steps 2–3 the
--    columns hold only NULLs, so the cast is trivially safe regardless of prior data.
ALTER TABLE public."Membership" ALTER COLUMN "userId"       TYPE uuid USING "userId"::uuid;
ALTER TABLE public."Attendance" ALTER COLUMN "markedById"   TYPE uuid USING "markedById"::uuid;
ALTER TABLE public."FeePayment" ALTER COLUMN "recordedById" TYPE uuid USING "recordedById"::uuid;

-- 5. Re-add the FKs, now pointing at neon_auth."user" (cross-schema).
ALTER TABLE public."Membership"
  ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES neon_auth."user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."Attendance"
  ADD CONSTRAINT "Attendance_markedById_fkey"
  FOREIGN KEY ("markedById") REFERENCES neon_auth."user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public."FeePayment"
  ADD CONSTRAINT "FeePayment_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES neon_auth."user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Drop the obsolete Clerk-mirror table.
DROP TABLE IF EXISTS public."User";

COMMIT;
