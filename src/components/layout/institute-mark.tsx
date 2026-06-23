import { GraduationCap } from "lucide-react"

import { cn } from "@/lib/utils"

/** The institute logo (base64 data URL) or the default graduation-cap badge.
 *  Defaults to size-8; pass `className` (e.g. "size-6") to resize. */
export function InstituteMark({
  logoUrl,
  className,
}: {
  logoUrl: string | null
  className?: string
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={cn("size-8 shrink-0 rounded-full border object-cover", className)}
      />
    )
  }
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full",
        className
      )}
    >
      <GraduationCap className="size-4.5" />
    </span>
  )
}
