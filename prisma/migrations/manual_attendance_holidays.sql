-- Attendance holidays / working-day config.
--   * Holiday: a dated ruling (OFF | WORKING) that overrides the weekly-off
--     pattern. classId NULL = institute-wide; a class-specific row wins.
--   * Class.weeklyOffOverride: per-class weekly-off (Luxon weekdays 1..7);
--     NULL = inherit the institute default (Setting "attendance.weeklyOff").
-- The institute default weekly-off lives in the existing Setting table (no DDL).
-- Hand-applied per the project process: tested on the dev branch, applied to
-- prod on push. Additive only.
BEGIN;

CREATE TYPE "public"."HolidayKind" AS ENUM ('OFF', 'WORKING');

CREATE TABLE "public"."Holiday" (
  "id"          text NOT NULL,
  "instituteId" text NOT NULL,
  "classId"     text,
  "date"        timestamptz(3) NOT NULL,
  "kind"        "public"."HolidayKind" NOT NULL DEFAULT 'OFF',
  "name"        text,
  "createdById" uuid,
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamp(3) NOT NULL,
  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Holiday"
  ADD CONSTRAINT "Holiday_instituteId_fkey"
  FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Holiday"
  ADD CONSTRAINT "Holiday_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "public"."Class"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Holiday"
  ADD CONSTRAINT "Holiday_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "neon_auth"."user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- One ruling per (institute, class, date). NULLS NOT DISTINCT so two
-- institute-wide rows (classId IS NULL) can't collide on the same date.
CREATE UNIQUE INDEX "Holiday_instituteId_classId_date_key"
  ON "public"."Holiday" ("instituteId", "classId", "date") NULLS NOT DISTINCT;

CREATE INDEX "Holiday_instituteId_date_idx"
  ON "public"."Holiday" ("instituteId", "date");

-- Per-class weekly-off override: JSON array of weekdays, or NULL = inherit.
ALTER TABLE "public"."Class" ADD COLUMN "weeklyOffOverride" jsonb;

COMMIT;
