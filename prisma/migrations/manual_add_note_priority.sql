-- TSU: note priority (Low / Normal / High / Urgent).
-- Adds a NotePriority enum and a priority column on Note, defaulting to NORMAL so
-- existing rows stay valid. Additive and idempotent — safe to re-run, and covers
-- environments where the enum was created before URGENT was added.
DO $$
BEGIN
  CREATE TYPE public."NotePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Patch enums created with the original three values (URGENT appends as highest).
ALTER TYPE public."NotePriority" ADD VALUE IF NOT EXISTS 'URGENT';

ALTER TABLE public."Note"
  ADD COLUMN IF NOT EXISTS "priority" public."NotePriority" NOT NULL DEFAULT 'NORMAL';
