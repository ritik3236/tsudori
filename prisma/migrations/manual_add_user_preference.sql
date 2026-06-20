-- Per-user appearance preference (theme + font). Additive, backward-compatible:
-- a new table in `public` keyed 1:1 to neon_auth.user. No changes to existing
-- tables, so existing rows/queries are unaffected.
--
-- Applied: dev branch (br-rough-bar-ao4vfp5e) · prod (br-solitary-snow)
-- updatedAt has no DB default — Prisma's @updatedAt always supplies it (matches
-- the canonical DDL Prisma generates, so no schema drift).

CREATE TABLE IF NOT EXISTS "public"."UserPreference" (
    "userId"    UUID         NOT NULL,
    "theme"     TEXT,
    "font"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "public"."UserPreference"
    DROP CONSTRAINT IF EXISTS "UserPreference_userId_fkey";

ALTER TABLE "public"."UserPreference"
    ADD CONSTRAINT "UserPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
