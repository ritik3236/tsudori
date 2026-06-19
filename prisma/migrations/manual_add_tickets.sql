-- Support tickets (product-support desk).
--
-- Tables live in `public`; author FKs cross to `neon_auth.user` (managed by Neon
-- Auth, never by Prisma). Hand-applied per project policy — NOT via
-- `prisma migrate dev`. Idempotent: safe to re-run on any branch.
--
-- Applied to: sandbox (br-rough-bar-ao4vfp5e / ep-square-bar) and prod
-- (br-solitary-snow-aoi1buu9 / ep-sweet-unit).

DO $$ BEGIN
  CREATE TYPE public."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."TicketCategory" AS ENUM ('BUG', 'FEATURE', 'QUESTION', 'BILLING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public."Ticket" (
  "id"          TEXT PRIMARY KEY,
  "instituteId" TEXT NOT NULL,
  "requesterId" UUID,
  "subject"     TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category"    public."TicketCategory" NOT NULL DEFAULT 'QUESTION',
  "priority"    public."TicketPriority" NOT NULL DEFAULT 'NORMAL',
  "status"      public."TicketStatus"   NOT NULL DEFAULT 'OPEN',
  "resolvedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."TicketComment" (
  "id"            TEXT PRIMARY KEY,
  "ticketId"      TEXT NOT NULL,
  "authorId"      UUID,
  "body"          TEXT NOT NULL,
  "authorIsStaff" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Ticket_instituteId_createdAt_idx" ON public."Ticket" ("instituteId", "createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_status_createdAt_idx" ON public."Ticket" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "TicketComment_ticketId_createdAt_idx" ON public."TicketComment" ("ticketId", "createdAt");

DO $$ BEGIN
  ALTER TABLE public."Ticket"
    ADD CONSTRAINT "Ticket_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES public."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."Ticket"
    ADD CONSTRAINT "Ticket_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES neon_auth."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."TicketComment"
    ADD CONSTRAINT "TicketComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES public."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."TicketComment"
    ADD CONSTRAINT "TicketComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES neon_auth."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
