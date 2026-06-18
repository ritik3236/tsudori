"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Check, Copy, Mail } from "lucide-react"

import { ApiError } from "@/lib/http"
import {
  inviteCreateFormSchema,
  type InviteCreateFormValues,
} from "@/features/invitations/schema"
import { useCreateInvitation } from "@/features/invitations/hooks"
import { useAssignableRoles } from "@/features/members/hooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function InviteMemberButton() {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { data: roles } = useAssignableRoles()
  const create = useCreateInvitation()

  const form = useForm<InviteCreateFormValues>({
    resolver: zodResolver(inviteCreateFormSchema),
    defaultValues: { email: "", roleId: "" },
  })

  function reset() {
    setLink(null)
    setCopied(false)
    form.reset({ email: "", roleId: "" })
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function onSubmit(values: InviteCreateFormValues) {
    create.mutate(values, {
      onSuccess: ({ token }) => {
        setLink(`${window.location.origin}/invite/${token}`)
      },
      onError: (e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't create the invite."),
    })
  }

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Invite link copied.")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — select and copy the link manually.")
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setOpen(true)}>
        <Mail className="size-4" /> Invite member
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              {link
                ? "Share this link with the person — it expires in 7 days."
                : "They’ll set their own password when they accept."}
            </DialogDescription>
          </DialogHeader>

          {link ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input value={link} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="person@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pick a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(roles ?? []).map((r) => (
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? "Creating…" : "Create invite link"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
