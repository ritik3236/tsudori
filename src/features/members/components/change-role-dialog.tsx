"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  memberUpdateSchema,
  type MemberUpdateInput,
} from "@/features/members/schema"
import { useAssignableRoles, useUpdateMemberRole } from "@/features/members/hooks"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea"

type ChangeRoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  memberName: string
  currentRoleId: string
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  userId,
  memberName,
  currentRoleId,
}: ChangeRoleDialogProps) {
  const { data: roles } = useAssignableRoles()
  const update = useUpdateMemberRole(userId)

  const form = useForm<MemberUpdateInput>({
    resolver: zodResolver(memberUpdateSchema),
    defaultValues: { roleId: currentRoleId, reason: "" },
  })

  // Re-sync to the member's current role each time the dialog opens.
  useEffect(() => {
    if (open) form.reset({ roleId: currentRoleId, reason: "" })
  }, [open, currentRoleId, form])

  const submit = form.handleSubmit((values) => {
    if (values.roleId === currentRoleId) {
      onOpenChange(false)
      return
    }
    update.mutate(
      { roleId: values.roleId, reason: values.reason },
      { onSuccess: () => onOpenChange(false) }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Choose the role for {memberName}. It takes effect on their next request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
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
                            roles?.find((r) => r.id === v)?.name ?? "Select a role"
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles?.map((r) => (
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

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="e.g. Promoted to admin"
                      disabled={update.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={update.isPending}
                    className="w-full sm:w-auto"
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={update.isPending}
                className="w-full sm:w-auto"
              >
                {update.isPending ? "Saving…" : "Save role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
