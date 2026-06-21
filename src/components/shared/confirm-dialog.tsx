"use client"

import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  loading?: boolean
  /** Show a reason field; its trimmed value is passed to onConfirm. */
  withReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  /** Block confirm until a reason is entered. Default: optional. */
  reasonRequired?: boolean
  /** Receives the trimmed reason when withReason is set, otherwise "". */
  onConfirm: (reason: string) => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  withReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Recorded in the audit log",
  reasonRequired = false,
  onConfirm,
}: ConfirmDialogProps) {
  const reasonId = useId()
  const [reason, setReason] = useState("")

  // Clear the reason when the dialog closes so it never leaks into the next open.
  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("")
    onOpenChange(next)
  }

  const blocked = loading || (withReason && reasonRequired && !reason.trim())

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {withReason && (
          <div className="space-y-1.5">
            <Label htmlFor={reasonId}>
              {reasonLabel}
              {!reasonRequired && (
                <span className="text-muted-foreground font-normal"> (optional)</span>
              )}
            </Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={2}
              disabled={loading}
            />
          </div>
        )}
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={loading} className="w-full sm:w-auto">
                {cancelLabel}
              </Button>
            }
          />
          <Button
            variant={variant}
            onClick={() => onConfirm(reason.trim())}
            disabled={blocked}
            className="w-full sm:w-auto"
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
