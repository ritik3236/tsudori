"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "@/features/members/schema"
import { useResetMemberPassword } from "@/features/members/hooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type ResetPasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  memberName: string
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  memberName,
}: ResetPasswordDialogProps) {
  const reset = useResetMemberPassword(userId)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  // Clear the fields whenever the dialog (re)opens, possibly for another member.
  useEffect(() => {
    if (open) form.reset({ newPassword: "", confirmPassword: "" })
  }, [open, userId, form])

  const submit = form.handleSubmit((values) =>
    reset.mutate(
      { newPassword: values.newPassword },
      { onSuccess: () => onOpenChange(false) }
    )
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {memberName}. Share it with them securely — they
            can change it after signing in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
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
                    <Input type="password" autoComplete="new-password" {...field} />
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
                    disabled={reset.isPending}
                    className="w-full sm:w-auto"
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={reset.isPending}
                className="w-full sm:w-auto"
              >
                {reset.isPending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
