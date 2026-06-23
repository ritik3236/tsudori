"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import {
  instituteCreateFormSchema,
  type InstituteCreateFormValues,
} from "@/features/platform/schema"
import { createInstituteAction } from "@/features/platform/actions"
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

function emptyValues(): InstituteCreateFormValues {
  return {
    name: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  }
}

export function CreateInstituteDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const form = useForm<InstituteCreateFormValues>({
    resolver: zodResolver(instituteCreateFormSchema),
    defaultValues: emptyValues(),
  })

  function onSubmit(v: InstituteCreateFormValues) {
    startTransition(async () => {
      try {
        const row = await createInstituteAction({
          name: v.name,
          adminName: v.adminName,
          adminEmail: v.adminEmail,
          adminPassword: v.adminPassword,
        })
        toast.success(`"${row.name}" created.`)
        form.reset(emptyValues())
        setOpen(false)
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Couldn't create the institute."
        )
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) form.reset(emptyValues())
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" /> Create institute
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create institute</DialogTitle>
          <DialogDescription>
            Sets up the institute and its first admin. Share the temporary
            password with them — they can change it after signing in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institute name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sunrise Academy" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                First admin
              </p>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="adminName"
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
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminPassword"
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
              </div>
            </div>

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
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
