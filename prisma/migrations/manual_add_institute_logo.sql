-- TSU: add Institute.logoUrl (base64 data URL of the institute logo).
-- Additive + nullable, so safe on existing rows.
ALTER TABLE "Institute" ADD COLUMN "logoUrl" TEXT;
