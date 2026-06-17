// Wire DTOs for the roles & permissions manager.

export type PermissionCatalogItem = {
  key: string
  module: string
  description: string | null
}

export type RolePermissions = {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  /** Permission keys currently granted to this role. */
  permissionKeys: string[]
  /** Whether the current viewer may edit this role (seniority-gated). */
  editable: boolean
}

export type RolesData = {
  roles: RolePermissions[]
  /** Every assignable permission, for building the matrix. */
  catalog: PermissionCatalogItem[]
  /** The viewer's own role id — its lockout-critical permissions are protected. */
  currentRoleId: string | null
  /** Super admins bypass permission checks, so their edits can't lock them out. */
  isSuperAdmin: boolean
}
