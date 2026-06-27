"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatCurrency } from "@/lib/format"
import { nowDate, toDateInputValue } from "@/lib/date-helper"
import { useCourses } from "@/features/course/hooks"
import { useCreateEnrollment } from "@/features/enrollment/hooks"
import {
  enrollmentFormSchema,
  enrollmentValuesToInput,
  type EnrollmentFormValues,
} from "@/features/enrollment/schema"
import { Button } from "@/components/ui/button"
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
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FeeModeField } from "@/features/enrollment/components/fee-mode-field"

type Props = {
  studentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When the student is on an installment plan, adding a course doesn't auto-bill
   *  it — show a note and hide the (ignored) fee/scholarship fields. */
  isInstallment?: boolean
}

export function EnrollDialog({ studentId, open, onOpenChange, isInstallment }: Props) {
  const { data: courses } = useCourses()
  const create = useCreateEnrollment()
  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      courseId: "",
      startDate: toDateInputValue(nowDate()),
      feeMode: "COURSE",
      feeAmount: "",
      discountPercent: "",
    },
  })

  const activeCourses = courses?.filter((c) => c.status === "ACTIVE") ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add course enrolment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) =>
              create.mutate(enrollmentValuesToInput(studentId, v), {
                onSuccess: () => {
                  onOpenChange(false)
                  form.reset()
                },
              })
            )}
            className="space-y-4"
          >
            {isInstallment && (
              <div className="rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                On an installment plan — this course&apos;s monthly fee won&apos;t be billed
                automatically. Update the installment schedule to include it.
              </div>
            )}
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a course">
                          {(v: string) =>
                            activeCourses.find((c) => c.id === v)?.name ?? "Select a course"
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {formatCurrency(c.monthlyFee)}/mo
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
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isInstallment && <FeeModeField />}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={create.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Add enrolment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
