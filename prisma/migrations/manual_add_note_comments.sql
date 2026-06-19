-- Note replies (a flat comment thread on the shared note board).
--
-- Table lives in `public`; author FK crosses to `neon_auth.user` (managed by
-- Neon Auth, never by Prisma). Hand-applied per project policy — NOT via
-- `prisma migrate dev`. Idempotent: safe to re-run on any branch.
--
-- Applied to: sandbox (br-rough-bar-ao4vfp5e / ep-square-bar) and prod
-- (br-solitary-snow-aoi1buu9 / ep-sweet-unit).

CREATE TABLE IF NOT EXISTS public."NoteComment" (
  "id"        TEXT PRIMARY KEY,
  "noteId"    TEXT NOT NULL,
  "authorId"  UUID,
  "body"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "NoteComment_noteId_createdAt_idx" ON public."NoteComment" ("noteId", "createdAt");

DO $$ BEGIN
  ALTER TABLE public."NoteComment"
    ADD CONSTRAINT "NoteComment_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES public."Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."NoteComment"
    ADD CONSTRAINT "NoteComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES neon_auth."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
