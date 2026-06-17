import { z } from "zod"

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string().trim().min(1)).max(100),
})

export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>
