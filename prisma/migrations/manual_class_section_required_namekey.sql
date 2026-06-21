-- Classes: make `section` mandatory and enforce case-/space-insensitive
-- uniqueness on (name, section) per institute via a normalized `nameKey`.
--   * Existing rows with a missing section are backfilled to 'A'.
--   * nameKey = lower(name w/o whitespace) || '|' || lower(section w/o whitespace),
--     mirroring normalizeClassKey() in src/features/classes/schema.ts exactly.
--   * The old name-only unique index is replaced by a unique index on
--     (instituteId, nameKey).
-- Hand-applied per the project process: tested on the dev branch, applied to
-- prod on push. Run the collision check first (see PR notes) — this will fail
-- if two existing rows normalize to the same key.
BEGIN;

-- 1. Backfill: every class needs a section.
UPDATE "public"."Class"
SET "section" = 'A'
WHERE "section" IS NULL OR btrim("section") = '';

ALTER TABLE "public"."Class" ALTER COLUMN "section" SET NOT NULL;

-- 2. Normalized identity key.
ALTER TABLE "public"."Class" ADD COLUMN "nameKey" text;

UPDATE "public"."Class"
SET "nameKey" =
  lower(regexp_replace("name", '\s+', '', 'g')) || '|' ||
  lower(regexp_replace("section", '\s+', '', 'g'))
WHERE "nameKey" IS NULL;

ALTER TABLE "public"."Class" ALTER COLUMN "nameKey" SET NOT NULL;

-- 3. Swap the name-only unique for the normalized-key unique.
DROP INDEX IF EXISTS "public"."Class_instituteId_name_key";

CREATE UNIQUE INDEX "Class_instituteId_nameKey_key"
  ON "public"."Class" ("instituteId", "nameKey");

COMMIT;
