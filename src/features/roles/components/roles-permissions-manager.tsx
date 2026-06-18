"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { useRolesData, useUpdateRolePermissions } from "@/features/roles/hooks"
import type {
  PermissionCatalogItem,
  RolePermissions,
  RolesData,
} from "@/features/roles/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"

const MODULE_LABELS: Record<string, string> = {
  student: "Students",
  attendance: "Attendance",
  fee: "Fees",
  class: "Classes",
  report: "Reports",
  institute: "Institute",
  member: "Members",
  role: "Roles",
}

function groupByModule(catalog: PermissionCatalogItem[]) {
  const groups: { module: string; items: PermissionCatalogItem[] }[] = []
  for (const item of catalog) {
    let group = groups.find((g) => g.module === item.module)
    if (!group) {
      group = { module: item.module, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}

export function RolesPermissionsManager() {
  const { data, isLoading } = useRolesData()

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Toggle what each role can do. Changes take effect immediately — no redeploy.
        {data.isSuperAdmin
          ? " As a super admin you always keep full access."
          : ""}
      </p>
      {data.roles.map((role) => (
        <RoleCard
          // Remount when the server copy changes (e.g. after a save) so the draft
          // resets to the persisted truth.
          key={`${role.id}:${role.permissionKeys.slice().sort().join(",")}`}
          role={role}
          data={data}
        />
      ))}
    </div>
  )
}

function RoleCard({ role, data }: { role: RolePermissions; data: RolesData }) {
  const update = useUpdateRolePermissions(role.id)
  const groups = useMemo(() => groupByModule(data.catalog), [data.catalog])

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role.permissionKeys)
  )
  // Collapsed by default so a long list of roles stays scannable.
  const [expanded, setExpanded] = useState(false)

  // Seniority-gated: roles at or above the viewer's own weight are read-only.
  const editable = role.editable

  const initial = useMemo(() => new Set(role.permissionKeys), [role.permissionKeys])
  const dirty =
    selected.size !== initial.size ||
    [...selected].some((k) => !initial.has(k))

  const toggle = (key: string, on: boolean) => {
    if (!editable) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const toggleModule = (items: PermissionCatalogItem[], on: boolean) => {
    if (!editable) return
    setSelected((prev) => {
      const next = new Set(prev)
      for (const it of items) {
        if (on) next.add(it.key)
        else next.delete(it.key)
      }
      return next
    })
  }

  return (
    <div className="bg-card rounded-2xl border">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          <ShieldCheck className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{role.name}</h2>
            <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-[10px] font-medium">
              {selected.size} selected
            </span>
            {dirty && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                Unsaved
              </span>
            )}
            {!editable && (
              <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-[10px] font-medium">
                Read-only
              </span>
            )}
          </div>
          {role.description && (
            <p className="text-muted-foreground text-xs">{role.description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "text-muted-foreground mt-1 size-4 shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {!expanded ? null : (
        <div className="space-y-4 px-4 pb-4">
      <div className="space-y-4">
        {groups.map((group) => {
          const all = group.items.every((it) => selected.has(it.key))
          return (
            <div key={group.module}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  {MODULE_LABELS[group.module] ?? group.module}
                </h3>
                {editable && (
                  <button
                    type="button"
                    onClick={() => toggleModule(group.items, !all)}
                    className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
                  >
                    {all ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {group.items.map((item) => {
                  const checked = selected.has(item.key)
                  return (
                    <label
                      key={item.key}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors",
                        checked ? "border-violet-300 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-500/10" : "hover:bg-muted/50",
                        editable ? "cursor-pointer" : "cursor-default opacity-80"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={!editable}
                        onCheckedChange={(on) => toggle(item.key, on)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {item.description ?? item.key}
                        </span>
                        <span className="text-muted-foreground block truncate text-[11px]">
                          {item.key}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {editable ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              disabled={update.isPending}
              onClick={() => setSelected(new Set(role.permissionKeys))}
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            disabled={!dirty || update.isPending}
            onClick={() => update.mutate({ permissions: [...selected] })}
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">
          This role is at or above your seniority — only a higher-level admin can
          change it.
        </p>
      )}
        </div>
      )}
    </div>
  )
}
