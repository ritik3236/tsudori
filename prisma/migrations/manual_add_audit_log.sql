-- Generic audit trail for sensitive mutations (reversals, member/role changes,
-- student archive, fee waive). Append-only; written in-transaction from the
-- service layer. `actorId` FKs to the Neon-auth user (SET NULL if that user is
-- removed, so the trail survives). Hand-applied: tested on the dev branch,
-- applied to prod on push.
BEGIN;

CREATE TABLE "public"."AuditLog" (
  "id"          TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "actorId"     UUID,
  "action"      TEXT NOT NULL,
  "entityType"  TEXT NOT NULL,
  "entityId"    TEXT NOT NULL,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_instituteId_createdAt_idx"
  ON "public"."AuditLog" ("instituteId", "createdAt");
CREATE INDEX "AuditLog_instituteId_entityType_entityId_idx"
  ON "public"."AuditLog" ("instituteId", "entityType", "entityId");
CREATE INDEX "AuditLog_instituteId_actorId_idx"
  ON "public"."AuditLog" ("instituteId", "actorId");

ALTER TABLE "public"."AuditLog"
  ADD CONSTRAINT "AuditLog_instituteId_fkey"
  FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "neon_auth"."user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
