"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import {
  instituteCreateSchema,
  type InstituteCreateInput,
} from "@/features/platform/schema"
import { createInstituteAction } from "@/features/platform/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
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

export function CreateInstituteDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const form = useForm<InstituteCreateInput>({
    resolver: zodResolver(instituteCreateSchema),
    defaultValues: { name: "" },
  })

  function onSubmit(v: InstituteCreateInput) {
    startTransition(async () => {
      try {
        const row = await createInstituteAction(v.name)
        toast.success(`"${row.name}" created.`)
        form.reset()
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
        if (!o) form.reset()
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
