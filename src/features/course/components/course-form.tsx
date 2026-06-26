"use client"

import { useRef } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import {
  courseFormSchema,
  formValuesToInput,
  type CourseFormValues,
  type CourseCreateInput,
} from "@/features/course/schema"
import type { CourseListItem } from "@/features/course/types"
import { useCourses } from "@/features/course/hooks"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

type CourseFormProps = {
  defaultValues?: CourseListItem
  submitLabel: string
  submitting: boolean
  onSubmit: (input: CourseCreateInput) => void
  onCancel: () => void
}

function emptyValues(): CourseFormValues {
  return {
    name: "",
    durationMonths: "",
    monthlyFee: "",
    status: "ACTIVE",
    isBundle: false,
    memberCourseIds: [],
    components: [],
  }
}

function courseToFormValues(c: CourseListItem): CourseFormValues {
  return {
    name: c.name,
    durationMonths: String(c.durationMonths),
    monthlyFee: String(c.monthlyFee),
    status: c.status,
    isBundle: c.isBundle,
    memberCourseIds: c.members.map((m) => m.id),
    components: c.components.map((m) => ({ name: m.name, amount: String(m.amount) })),
  }
}

export function CourseForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: CourseFormProps) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: defaultValues ? courseToFormValues(defaultValues) : emptyValues(),
  })
  const components = useFieldArray({ control: form.control, name: "components" })
  const { data: courses } = useCourses()
  // Eligible members: other active, non-bundle courses (a bundle can't nest a bundle).
  const available = (courses ?? []).filter(
    (c) => c.status === "ACTIVE" && !c.isBundle && c.id !== defaultValues?.id
  )
  // Tracks the last fee we auto-filled from the member sum, so member toggles only
  // overwrite the fee while the user hasn't typed their own (preserves a saved combo
  // discount when editing a bundle's members).
  const lastAutoFee = useRef<string | null>(null)

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => onSubmit(formValuesToInput(v)))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. NEET Foundation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="monthlyFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly fee</FormLabel>
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
            name="durationMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (months)</FormLabel>
                <FormControl>
                  <Input type="number" min="1" step="1" placeholder="12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        {/* Bundle — packages other courses under this course's combined fee. */}
        <FormField
          control={form.control}
          name="isBundle"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <label className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                </FormControl>
                <span className="text-sm font-medium">
                  Bundle — combine several courses under one fee
                </span>
              </label>
              {field.value && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">
                    Pick the courses this bundle includes. The monthly fee above is the combined
                    price — we prefill it with the sum, so just apply your combo discount.
                  </p>
                  <FormField
                    control={form.control}
                    name="memberCourseIds"
                    render={({ field: m }) => (
                      <div className="space-y-1.5">
                        {available.length === 0 ? (
                          <p className="text-muted-foreground text-xs">
                            No other active courses to bundle yet.
                          </p>
                        ) : (
                          available.map((c) => (
                            <label
                              key={c.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="flex items-center gap-2">
                                <Checkbox
                                  checked={m.value.includes(c.id)}
                                  onCheckedChange={(on) => {
                                    const next =
                                      on === true
                                        ? [...m.value, c.id]
                                        : m.value.filter((x) => x !== c.id)
                                    m.onChange(next)
                                    const sum = String(
                                      available
                                        .filter((x) => next.includes(x.id))
                                        .reduce((s, x) => s + x.monthlyFee, 0)
                                    )
                                    const current = form.getValues("monthlyFee")
                                    // Only auto-fill while the user hasn't typed their own fee.
                                    if (
                                      current === "" ||
                                      current === "0" ||
                                      current === lastAutoFee.current
                                    ) {
                                      form.setValue("monthlyFee", sum)
                                      lastAutoFee.current = sum
                                    }
                                  }}
                                />
                                {c.name}
                              </span>
                              <span className="text-muted-foreground tabular-nums">
                                {formatCurrency(c.monthlyFee)}/mo
                              </span>
                            </label>
                          ))
                        )}
                        <FormMessage />
                      </div>
                    )}
                  />
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* One-time fees — admission/exam/etc, charged once per enrolment. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="m-0">One-time fees</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => components.append({ name: "", amount: "" })}
            >
              <Plus className="size-4" /> Add fee
            </Button>
          </div>
          {components.fields.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Optional — e.g. an Admission or Exam fee, charged once when a student enrols.
            </p>
          ) : (
            <div className="space-y-2">
              {components.fields.map((f, i) => (
                <div key={f.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`components.${i}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Fee name (e.g. Admission)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`components.${i}.amount`}
                    render={({ field }) => (
                      <FormItem className="w-28">
                        <FormControl>
                          <Input type="number" min="0" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => components.remove(i)}
                    aria-label="Remove fee"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

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
