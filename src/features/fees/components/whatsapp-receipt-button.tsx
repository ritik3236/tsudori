import { cn } from "@/lib/utils"
import { formatDateLong } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import type { ReceiptData } from "@/features/fees/types"
import {
  feeReceivedMessage,
  toWhatsAppNumber,
  whatsappUrl,
  WhatsAppGlyph,
} from "@/lib/whatsapp"

export function WhatsAppReceiptButton({ receipt }: { receipt: ReceiptData }) {
  const number = toWhatsAppNumber(receipt.student.contactNumber)

  // No usable parent number — show the button disabled with an explanation.
  if (!number) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: "outline" }),
          "cursor-not-allowed opacity-50"
        )}
        title="No contact number"
        aria-disabled="true"
      >
        <WhatsAppGlyph className="size-4" /> WhatsApp
      </span>
    )
  }

  const url = whatsappUrl(
    number,
    feeReceivedMessage({
      studentName: receipt.student.fullName,
      amount: receipt.amount,
      receiptNo: receipt.receiptNo,
      date: formatDateLong(receipt.paidAt),
      institutionName: receipt.institute.name,
    })
  )

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants(),
        "bg-[#25D366] text-white hover:bg-[#1fad54] dark:hover:bg-[#1fad54]"
      )}
    >
      <WhatsAppGlyph className="size-4" /> WhatsApp
    </a>
  )
}
