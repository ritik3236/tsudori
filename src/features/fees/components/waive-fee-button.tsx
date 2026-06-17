"use client"

import { useState, type ComponentProps } from "react"
import { HandCoins } from "lucide-react"

import { Button } from "@/components/ui/button"
import { WaiveFeeDialog } from "@/features/fees/components/waive-fee-dialog"

type WaiveFeeButtonProps = {
  studentId: string
  studentName: string
  remainingDue: number
  periodMonth: number
  periodYear: number
  label?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function WaiveFeeButton({
  studentId,
  studentName,
  remainingDue,
  periodMonth,
  periodYear,
  label = "Waive",
  variant = "ghost",
  size = "sm",
  className,
}: WaiveFeeButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <HandCoins className="size-4" /> {label}
      </Button>
      <WaiveFeeDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        remainingDue={remainingDue}
        periodMonth={periodMonth}
        periodYear={periodYear}
      />
    </>
  )
}
