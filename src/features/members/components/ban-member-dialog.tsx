"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { banMemberSchema, type BanMemberInput } from "@/features/members/schema"
import { useBanMember } from "@/features/members/hooks"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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

type BanMemberDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  memberName: string
}

export function BanMemberDialog({
  open,
  onOpenChange,
  userId,
  memberName,
}: BanMemberDialogProps) {
  const ban = useBanMember(userId)

  const form = useForm<BanMemberInput>({
    resolver: zodResolver(banMemberSchema),
    defaultValues: { reason: "" },
  })

  useEffect(() => {
    if (open) form.reset({ reason: "" })
  }, [open, form])

  const submit = form.handleSubmit((values) =>
    ban.mutate(values.reason?.trim() || undefined, {
      onSuccess: () => onOpenChange(false),
    })
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {memberName}?</DialogTitle>
          <DialogDescription>
            They&apos;ll be signed out and blocked from signing in until you unban
            them. Their data and history are kept.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Shown to admins only"
                      maxLength={200}
                      {...field}
                      value={field.value ?? ""}
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
                    disabled={ban.isPending}
                    className="w-full sm:w-auto"
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={ban.isPending}
                className="w-full sm:w-auto"
              >
                {ban.isPending ? "Banning…" : "Ban member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
