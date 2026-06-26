"use client"

import { useFormContext } from "react-hook-form"

import { cn } from "@/lib/utils"
import { FEE_MODES, FEE_MODE_LABEL } from "@/features/enrollment/schema"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

/**
 * Shared fee-pricing control: a segmented "Course fee / Custom ₹ / % off" toggle
 * plus the relevant input. Reads the surrounding react-hook-form context, so it
 * works in any form with string `feeMode` / `feeAmount` / `discountPercent`
 * fields (the enrol + edit dialogs).
 */
export function FeeModeField() {
  const { control } = useFormContext()
  return (
    <FormField
      control={control}
      name="feeMode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Fee</FormLabel>
          <div className="bg-muted/50 flex gap-0.5 rounded-md border p-0.5">
            {FEE_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => field.onChange(m)}
                className={cn(
                  "flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors",
                  field.value === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {FEE_MODE_LABEL[m]}
              </button>
            ))}
          </div>

          {field.value === "FIXED" && (
            <FormField
              control={control}
              name="feeAmount"
              render={({ field: f }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Input type="number" min="0" placeholder="Monthly amount (₹)" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {field.value === "PERCENT" && (
            <FormField
              control={control}
              name="discountPercent"
              render={({ field: f }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Input type="number" min="0" max="100" placeholder="% off the course fee" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {field.value === "COURSE" && (
            <p className="text-muted-foreground mt-2 text-xs">Bills the course&apos;s monthly fee.</p>
          )}
        </FormItem>
      )}
    />
  )
}
