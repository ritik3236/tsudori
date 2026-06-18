-- TSU: seed the fee:reverse permission and grant it to admin roles.
-- Idempotent. fee:configure is held only by "*" (admin) roles, so granting
-- fee:reverse wherever fee:configure exists matches re-running the seed.
INSERT INTO public."Permission" (id, key, module, description)
VALUES ('perm_fee_reverse', 'fee:reverse', 'fee', 'Reverse fee')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public."RolePermission" ("roleId", "permissionId")
SELECT rp."roleId", rev.id
FROM public."RolePermission" rp
JOIN public."Permission" cfg
  ON cfg.id = rp."permissionId" AND cfg.key = 'fee:configure'
CROSS JOIN public."Permission" rev
WHERE rev.key = 'fee:reverse'
ON CONFLICT DO NOTHING;
