"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// A non-native date field: a button that opens a calendar popover. Replaces
// <input type="date"> so the picker looks and behaves the same on every device.
// `value` / `onChange` speak the "yyyy-MM-dd" string the form already uses.
type DatePickerProps = {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  /** Latest selectable date ("yyyy-MM-dd"); later days are disabled and months
   *  past it can't be navigated to. Used to block future dates (e.g. attendance). */
  max?: string
} & Pick<
  React.ComponentProps<"button">,
  "id" | "disabled" | "aria-invalid" | "aria-describedby"
>

function toDate(value?: string): Date | undefined {
  if (!value) return undefined
  const parsed = parse(value, "yyyy-MM-dd", new Date())
  return isValid(parsed) ? parsed : undefined
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  max,
  ...triggerProps
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = toDate(value)
  const maxDate = toDate(max)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground"
            )}
            {...triggerProps}
          >
            {selected ? format(selected, "d MMM yyyy") : placeholder}
            <CalendarIcon className="size-4 opacity-60" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          endMonth={maxDate}
          disabled={maxDate ? { after: maxDate } : undefined}
          onSelect={(date) => {
            if (date) onChange?.(format(date, "yyyy-MM-dd"))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
