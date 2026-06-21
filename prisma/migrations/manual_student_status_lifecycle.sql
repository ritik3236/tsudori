-- Student lifecycle statuses: replace the binary ACTIVE | INACTIVE with
-- ACTIVE | ON_HOLD | LEFT | COMPLETED. Existing INACTIVE rows map to LEFT.
-- Recreates the enum (Postgres can't drop an enum value in place). Hand-applied
-- per the project process: tested on the dev branch, applied to prod on push.
BEGIN;

ALTER TYPE "public"."StudentStatus" RENAME TO "StudentStatus_old";

CREATE TYPE "public"."StudentStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'LEFT', 'COMPLETED');

ALTER TABLE "public"."Student" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."Student"
  ALTER COLUMN "status" TYPE "public"."StudentStatus"
  USING (CASE "status"::text WHEN 'INACTIVE' THEN 'LEFT' ELSE "status"::text END)::"public"."StudentStatus";

ALTER TABLE "public"."Student" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "public"."StudentStatus_old";

COMMIT;
