"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { formatCurrency } from "@/lib/format"
import {
  classFormSchema,
  formValuesToInput,
  NO_COURSE,
  type ClassFormValues,
  type ClassCreateInput,
} from "@/features/classes/schema"
import type { ClassListItem } from "@/features/classes/types"
import { useCourses } from "@/features/course/hooks"
import { Button } from "@/components/ui/button"
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

type ClassFormProps = {
  defaultValues?: ClassListItem
  submitLabel: string
  submitting: boolean
  onSubmit: (input: ClassCreateInput) => void
  onCancel: () => void
}

function emptyValues(): ClassFormValues {
  return { name: "", section: "", defaultMonthlyFee: "", courseId: NO_COURSE, status: "ACTIVE" }
}

function classToFormValues(cls: ClassListItem): ClassFormValues {
  return {
    name: cls.name,
    section: cls.section ?? "",
    defaultMonthlyFee: String(cls.defaultMonthlyFee),
    courseId: cls.courseId ?? NO_COURSE,
    status: cls.status,
  }
}

export function ClassForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: ClassFormProps) {
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: defaultValues ? classToFormValues(defaultValues) : emptyValues(),
  })
  const { data: courses } = useCourses()

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => onSubmit(formValuesToInput(v)))}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Class name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Grade 5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Section</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="defaultMonthlyFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default monthly fee</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={formatCurrency(0)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) =>
                        v === NO_COURSE
                          ? "No course"
                          : (courses?.find((c) => c.id === v)?.name ?? "Select course")
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_COURSE}>No course</SelectItem>
                  {courses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
