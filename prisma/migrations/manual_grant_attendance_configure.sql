-- Seed the attendance:configure permission and grant it to admin roles.
-- Idempotent. institute:manage is held only by "*" (admin) roles, so granting
-- attendance:configure wherever institute:manage exists matches re-running seed.
INSERT INTO public."Permission" (id, key, module, description)
VALUES ('perm_attendance_configure', 'attendance:configure', 'attendance', 'Configure attendance')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public."RolePermission" ("roleId", "permissionId")
SELECT rp."roleId", cfg.id
FROM public."RolePermission" rp
JOIN public."Permission" mng
  ON mng.id = rp."permissionId" AND mng.key = 'institute:manage'
CROSS JOIN public."Permission" cfg
WHERE cfg.key = 'attendance:configure'
ON CONFLICT DO NOTHING;
