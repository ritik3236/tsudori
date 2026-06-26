"use client"

import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatClassName, toDateInputValue } from "@/lib/format"
import { nowDate } from "@/lib/date-helper"
import type { StudentStatus } from "@prisma/client"

import {
  NO_CLASS,
  STUDENT_STATUSES,
  formValuesToInput,
  studentCreateFormSchema,
  studentFormSchema,
  type StudentCreateInput,
  type StudentFormValues,
} from "@/features/students/schema"
import { useClassOptions } from "@/features/students/hooks"
import { STUDENT_STATUS_LABEL } from "@/features/students/components/student-status-badge"
import type { StudentDetail } from "@/features/students/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Textarea } from "@/components/ui/textarea"
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

type StudentFormProps = {
  defaultValues?: Partial<StudentFormValues>
  submitLabel: string
  submitting?: boolean
  /** Require a class (create flow). Edit leaves it optional so legacy
   *  class-less students stay editable. */
  requireClass?: boolean
  onSubmit: (input: StudentCreateInput) => void
  onCancel?: () => void
}

function emptyValues(): StudentFormValues {
  return {
    fullName: "",
    classId: NO_CLASS,
    rollNumber: "",
    guardianName: "",
    contactNumber: "",
    email: "",
    admissionDate: toDateInputValue(nowDate()),
    status: "ACTIVE",
    notes: "",
  }
}

/** Builds form defaults from an existing student (for the edit screen). */
export function studentToFormValues(student: StudentDetail): StudentFormValues {
  return {
    fullName: student.fullName,
    classId: student.classId ?? NO_CLASS,
    rollNumber: student.rollNumber ?? "",
    guardianName: student.guardianName ?? "",
    contactNumber: student.contactNumber ?? "",
    email: student.email ?? "",
    admissionDate: toDateInputValue(student.admissionDate),
    status: student.status,
    notes: student.notes ?? "",
  }
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}

/** Marks a required field. */
function Req() {
  return (
    <span className="text-destructive" aria-hidden>
      {" *"}
    </span>
  )
}

export function StudentForm({
  defaultValues,
  submitLabel,
  submitting,
  requireClass,
  onSubmit,
  onCancel,
}: StudentFormProps) {
  const { data: classes } = useClassOptions()

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(requireClass ? studentCreateFormSchema : studentFormSchema),
    defaultValues: { ...emptyValues(), ...defaultValues },
  })

  const submit = form.handleSubmit((values) => onSubmit(formValuesToInput(values)))

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-8">
        <FormSection title="Student details">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    Full name
                    <Req />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Aarav Sharma" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Class
                    {requireClass && <Req />}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select class">
                          {(v: string) => {
                            if (!v || v === NO_CLASS) {
                              return requireClass ? (
                                <span className="text-muted-foreground">Select class</span>
                              ) : (
                                "No class"
                              )
                            }
                            const c = classes?.find((c) => c.id === v)
                            return c ? formatClassName(c.name, c.section) : "Select class"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* "No class" is only offered when class is optional (edit). */}
                      {!requireClass && <SelectItem value={NO_CLASS}>No class</SelectItem>}
                      {classes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {formatClassName(c.name, c.section)}
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
              name="rollNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="admissionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Admission date
                    <Req />
                  </FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(v: string) => STUDENT_STATUS_LABEL[v as StudentStatus] ?? v}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STUDENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STUDENT_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Guardian & contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="guardianName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent / Guardian</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact number</FormLabel>
                  <FormControl>
                    <Input inputMode="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Notes">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Anything worth remembering…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
