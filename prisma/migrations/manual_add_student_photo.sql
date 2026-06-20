-- Student profile photo (Vercel Blob URL). Additive, backward-compatible: one
-- new nullable column, existing rows/queries unaffected.
--
-- Applied: dev branch (br-rough-bar-ao4vfp5e) · prod (br-solitary-snow)

ALTER TABLE "public"."Student" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
