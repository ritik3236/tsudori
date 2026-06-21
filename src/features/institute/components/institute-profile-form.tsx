"use client"

import { useRef, type ChangeEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ImagePlus, Trash2 } from "lucide-react"

import {
  formValuesToInput,
  instituteFormSchema,
  type InstituteFormValues,
} from "@/features/institute/schema"
import type { InstituteProfile } from "@/features/institute/types"
import { useUpdateInstitute } from "@/features/institute/hooks"
import { getInitials } from "@/lib/format"
import { canvasToCompactDataUrl } from "@/lib/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const MAX_LOGO_PX = 256

// Downscale an image File to a small data URL. The institute logo loads with the
// tenant context on every page (for the header), so we keep the base64 light.
async function fileToLogoDataUrl(file: File): Promise<string> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("read failed"))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("decode failed"))
    el.src = src
  })
  const scale = Math.min(1, MAX_LOGO_PX / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d")?.drawImage(img, 0, 0, w, h)
  return canvasToCompactDataUrl(canvas)
}

type Props = {
  profile: InstituteProfile
  canManage: boolean
}

function toFormValues(p: InstituteProfile): InstituteFormValues {
  return {
    name: p.name,
    logoUrl: p.logoUrl ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    addressLine: p.addressLine ?? "",
  }
}

export function InstituteProfileForm({ profile, canManage }: Props) {
  const router = useRouter()
  const update = useUpdateInstitute()
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<InstituteFormValues>({
    resolver: zodResolver(instituteFormSchema),
    defaultValues: toFormValues(profile),
    disabled: !canManage,
  })

  const logo = useWatch({ control: form.control, name: "logoUrl" })
  const name = useWatch({ control: form.control, name: "name" })

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // let the user re-pick the same file
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      return
    }
    try {
      const dataUrl = await fileToLogoDataUrl(file)
      form.setValue("logoUrl", dataUrl, { shouldDirty: true, shouldValidate: true })
    } catch {
      toast.error("Couldn't process that image.")
    }
  }

  function onSubmit(values: InstituteFormValues) {
    update.mutate(formValuesToInput(values), {
      onSuccess: (saved) => {
        toast.success("Institute profile saved.")
        form.reset(toFormValues(saved))
        // The header/sidebar read the institute from the tenant context — refresh
        // so the name and logo update everywhere.
        router.refresh()
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Section title="Logo">
          <div className="flex items-center gap-4">
            <span className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Institute logo" className="size-full object-cover" />
              ) : (
                <span className="text-muted-foreground text-lg font-semibold">
                  {getInitials(name || "?")}
                </span>
              )}
            </span>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="size-4" /> {logo ? "Replace" : "Upload"}
                </Button>
                {logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => form.setValue("logoUrl", "", { shouldDirty: true })}
                  >
                    <Trash2 className="size-4" /> Remove
                  </Button>
                )}
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            PNG, JPG, or SVG. It&apos;s resized to a small square automatically.
          </p>
        </Section>

        <Section title="Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Institute name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sunrise Academy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="office@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input inputMode="tel" placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Street, area, city" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {canManage && (
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-card space-y-4 rounded-xl border p-4 sm:p-5">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}
