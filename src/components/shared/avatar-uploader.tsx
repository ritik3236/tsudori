"use client"

import { useCallback, useRef, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"
import { ImagePlus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/format"
import { canvasToCompactDataUrl } from "@/lib/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Stored size: 256px square webp — crisp at any avatar size, still a few KB.
const TARGET_PX = 256

type Props = {
  /** Used for the alt text and the initials fallback. */
  name: string
  imageUrl: string | null
  canEdit: boolean
  /** Avatar size class (default "size-14"). */
  className?: string
  fallbackClassName?: string
  /** Noun used in toasts, e.g. "Photo" → "Photo updated." */
  noun?: string
  /** Persist the cropped data URL; return the stored URL. */
  onUpload: (dataUrl: string) => Promise<string>
  /** Clear the image. Omit to hide the Remove action. */
  onRemove?: () => Promise<void>
}

/**
 * Avatar with an in-place crop-and-upload flow: pick → crop (square) → compress
 * to a small webp/jpeg → hand the data URL to `onUpload`. Generic over what the
 * image belongs to (a student row, the signed-in user, …) via the callbacks.
 */
export function AvatarUploader({
  name,
  imageUrl,
  canEdit,
  className,
  fallbackClassName,
  noun = "Photo",
  onUpload,
  onRemove,
}: Props) {
  const [url, setUrl] = useState<string | null>(imageUrl)
  const [src, setSrc] = useState<string | null>(null) // image being cropped
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPx, setAreaPx] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const lower = noun.toLowerCase()

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // let the same file be re-picked later
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.onerror = () => toast.error("Couldn't read that image.")
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_area: Area, px: Area) => setAreaPx(px), [])

  async function onSave() {
    if (!src || !areaPx) return
    setSaving(true)
    try {
      const dataUrl = await cropToImage(src, areaPx, TARGET_PX)
      const stored = await onUpload(dataUrl)
      setUrl(stored)
      setSrc(null)
      toast.success(`${noun} updated.`)
    } catch {
      toast.error(`Couldn't update the ${lower}.`)
    } finally {
      setSaving(false)
    }
  }

  async function onRemoveClick() {
    if (!onRemove) return
    setSaving(true)
    try {
      await onRemove()
      setUrl(null)
      setSrc(null)
      toast.success(`${noun} removed.`)
    } catch {
      toast.error(`Couldn't remove the ${lower}.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="relative shrink-0">
        <Avatar className={cn("size-14", className)}>
          {url && <AvatarImage src={url} alt={name} className="object-cover" />}
          <AvatarFallback className={cn("text-lg", fallbackClassName)}>
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={`Change ${lower}`}
              className="bg-primary text-primary-foreground ring-background absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full ring-2 transition-colors hover:opacity-90"
            >
              <ImagePlus className="size-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPick}
            />
          </>
        )}
      </div>

      <Dialog open={src !== null} onOpenChange={(open) => !open && setSrc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crop {lower}</DialogTitle>
            <DialogDescription>Drag to reposition, slide to zoom.</DialogDescription>
          </DialogHeader>

          <div className="bg-muted relative h-64 w-full overflow-hidden rounded-lg">
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="flex-1"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {url && onRemove ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onRemoveClick}
                disabled={saving}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSrc(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={onSave} disabled={saving || !areaPx}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save {lower}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Draw the chosen crop region (in source pixels) onto a square canvas at the
// target size and export a compressed data URL — so a multi-MB upload becomes a
// few-KB avatar (webp, or jpeg on iOS Safari).
async function cropToImage(src: string, area: Area, size: number): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("decode failed"))
    el.src = src
  })
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("no 2d context")
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size)
  return canvasToCompactDataUrl(canvas)
}
