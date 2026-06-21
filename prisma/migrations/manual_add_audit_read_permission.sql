-- Adds the `audit:read` permission and grants it to the system admin/auditor
-- roles across every institute. Super admins get it for free (ctx.permissions =
-- ALL_PERMISSIONS), so this is what makes institute-admin / auditor roles able to
-- open /admin/audit. Idempotent. Hand-applied: dev branch, then prod on push.
-- (Re-seeds pick it up automatically from src/lib/rbac.ts.)
BEGIN;

INSERT INTO "public"."Permission" ("id", "key", "module", "description", "createdAt")
VALUES (gen_random_uuid()::text, 'audit:read', 'audit', 'View the audit log', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "public"."RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "public"."Role" r
CROSS JOIN "public"."Permission" p
WHERE p."key" = 'audit:read'
  AND r."key" IN ('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'AUDITOR')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

COMMIT;
