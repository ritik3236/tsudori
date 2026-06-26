"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { EnrollmentStatus } from "@prisma/client"

import { useUpdateEnrollment, useAddOneTimeCharge } from "@/features/enrollment/hooks"
import {
  ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS_LABEL,
  enrollmentEditFormSchema,
  enrollmentEditValuesToInput,
  feeModeOf,
  oneTimeFeeFormSchema,
  oneTimeFeeValuesToInput,
  type EnrollmentEditFormValues,
  type OneTimeFeeFormValues,
} from "@/features/enrollment/schema"
import type { EnrollmentItem } from "@/features/enrollment/types"
import { FeeModeField } from "@/features/enrollment/components/fee-mode-field"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function EnrollmentRowActions({ enrollment }: { enrollment: EnrollmentItem }) {
  const [editOpen, setEditOpen] = useState(false)
  const [feeOpen, setFeeOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Open enrolment actions">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit enrolment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFeeOpen(true)}>
            <Plus className="size-4" /> Add one-time fee
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditEnrollmentDialog enrollment={enrollment} open={editOpen} onOpenChange={setEditOpen} />
      <OneTimeFeeDialog enrollment={enrollment} open={feeOpen} onOpenChange={setFeeOpen} />
    </>
  )
}

type DialogProps = {
  enrollment: EnrollmentItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditEnrollmentDialog({ enrollment, open, onOpenChange }: DialogProps) {
  const update = useUpdateEnrollment(enrollment.id)
  const form = useForm<EnrollmentEditFormValues>({
    resolver: zodResolver(enrollmentEditFormSchema),
    defaultValues: {
      ...feeModeOf(enrollment.feeOverride, enrollment.discountPercent),
      status: enrollment.status,
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit enrolment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) =>
              update.mutate(enrollmentEditValuesToInput(v), {
                onSuccess: () => onOpenChange(false),
              })
            )}
            className="space-y-4"
          >
            <FeeModeField />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {(v: string) =>
                            ENROLLMENT_STATUS_LABEL[v as EnrollmentStatus] ?? v
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ENROLLMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {ENROLLMENT_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-muted-foreground text-xs">
              Changing the fee only affects months not yet billed — past charges stay as recorded.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={update.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function OneTimeFeeDialog({ enrollment, open, onOpenChange }: DialogProps) {
  const add = useAddOneTimeCharge(enrollment.id)
  const form = useForm<OneTimeFeeFormValues>({
    resolver: zodResolver(oneTimeFeeFormSchema),
    defaultValues: { label: "", amount: "" },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add one-time fee</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) =>
              add.mutate(oneTimeFeeValuesToInput(v), {
                onSuccess: () => {
                  onOpenChange(false)
                  form.reset()
                },
              })
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Exam fee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={add.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={add.isPending}>
                {add.isPending ? "Adding…" : "Add fee"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
