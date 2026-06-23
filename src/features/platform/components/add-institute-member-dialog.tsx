"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Info, Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import {
  instituteMemberAddFormSchema,
  type InstituteMemberAddFormValues,
} from "@/features/platform/schema"
import type { RoleOption } from "@/features/members/types"
import type { InstituteMemberLookup } from "@/features/platform/service"
import {
  addInstituteMemberAction,
  lookupInstituteMemberAction,
} from "@/features/platform/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emptyValues(): InstituteMemberAddFormValues {
  return { email: "", roleId: "", name: "", password: "", confirmPassword: "", existing: false }
}

/** Add a member to one institute from its platform detail page. Email-first: once
 *  the email is entered we resolve it — an existing login is just attached (one
 *  login, many institutes), a new email reveals the create-account fields, and
 *  someone already a member here is blocked. Self-contained trigger + dialog;
 *  roles are passed by the server component, which revalidates on success. */
export function AddInstituteMemberDialog({
  instituteId,
  roles,
}: {
  instituteId: string
  roles: RoleOption[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [lookup, setLookup] = useState<InstituteMemberLookup | null>(null)
  const [checking, setChecking] = useState(false)

  const form = useForm<InstituteMemberAddFormValues>({
    resolver: zodResolver(instituteMemberAddFormSchema),
    defaultValues: emptyValues(),
  })

  function resetAll() {
    form.reset(emptyValues())
    setLookup(null)
    setChecking(false)
  }

  // Resolve the email against this institute when the field loses focus.
  async function checkEmail() {
    const email = form.getValues("email").trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      setLookup(null)
      form.setValue("existing", false)
      return
    }
    setChecking(true)
    try {
      const result = await lookupInstituteMemberAction(instituteId, email)
      setLookup(result)
      form.setValue("existing", result.status !== "new", {
        shouldValidate: form.formState.isSubmitted,
      })
    } catch {
      setLookup(null)
      form.setValue("existing", false)
    } finally {
      setChecking(false)
    }
  }

  function onSubmit(v: InstituteMemberAddFormValues) {
    if (lookup?.status === "member") return // also guarded by the disabled button
    const attachedName = lookup && "name" in lookup ? lookup.name : "Member"
    startTransition(async () => {
      try {
        await addInstituteMemberAction(instituteId, {
          email: v.email,
          roleId: v.roleId,
          // An existing login ignores these server-side — omit for clarity.
          ...(v.existing ? {} : { name: v.name, password: v.password }),
        })
        toast.success(`${v.existing ? attachedName : v.name} added.`)
        resetAll()
        setOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't add the member.")
      }
    })
  }

  const isMember = lookup?.status === "member"
  const isExisting = lookup?.status === "existing"
  const isNew = lookup?.status === "new"
  const lookupName = lookup && "name" in lookup ? lookup.name : null

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetAll()
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlus className="size-4" /> Add member
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Enter an email. If they already have a login, just pick a role —
            otherwise set up a new sign-in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="off"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        if (lookup) setLookup(null) // stale once the email changes
                      }}
                      onBlur={() => {
                        field.onBlur()
                        void checkEmail()
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {checking && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="size-3.5 animate-spin" /> Checking…
              </p>
            )}
            {isExisting && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="mt-px size-4 shrink-0" />
                <span>
                  <span className="font-medium">{lookupName}</span>{" "}
                  already has a login — they&apos;ll be added to this institute.
                  Just pick a role.
                </span>
              </div>
            )}
            {isMember && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <Info className="mt-px size-4 shrink-0" />
                <span>
                  <span className="font-medium">{lookupName}</span>{" "}
                  is already a member of this institute.
                </span>
              </div>
            )}

            {/* New person — collect their account details. */}
            {isNew && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Asha Rao" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary password</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Role — needed whether attaching or creating. Shown once we know the
                email isn't already a member here. */}
            {(isExisting || isNew) && (
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a role">
                            {(v: string) =>
                              roles.find((r) => r.id === v)?.name ?? "Select a role"
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    className="w-full sm:w-auto"
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending || checking || isMember || !lookup}
                className="w-full sm:w-auto"
              >
                {isPending ? "Adding…" : "Add member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
