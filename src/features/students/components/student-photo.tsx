"use client"

import { useCallback, useRef, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"
import { ImagePlus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { setStudentPhoto, removeStudentPhoto } from "@/features/students/photo-actions"

// Stored size: 256px square webp — crisp at any avatar size, still a few KB.
const TARGET_PX = 256

type Props = {
  studentId: string
  fullName: string
  photoUrl: string | null
  canEdit: boolean
}

export function StudentPhoto({ studentId, fullName, photoUrl: initialUrl, canEdit }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialUrl)
  const [src, setSrc] = useState<string | null>(null) // image being cropped
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPx, setAreaPx] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      const { photoUrl: url } = await setStudentPhoto(studentId, dataUrl)
      setPhotoUrl(url)
      setSrc(null)
      toast.success("Photo updated.")
    } catch {
      toast.error("Couldn't update the photo.")
    } finally {
      setSaving(false)
    }
  }

  async function onRemove() {
    setSaving(true)
    try {
      await removeStudentPhoto(studentId)
      setPhotoUrl(null)
      setSrc(null)
      toast.success("Photo removed.")
    } catch {
      toast.error("Couldn't remove the photo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="relative shrink-0">
        <Avatar className="size-14">
          {photoUrl && (
            <AvatarImage src={photoUrl} alt={fullName} className="object-cover" />
          )}
          <AvatarFallback className="text-lg">{getInitials(fullName)}</AvatarFallback>
        </Avatar>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change photo"
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
            <DialogTitle>Crop photo</DialogTitle>
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
            {photoUrl ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onRemove}
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
                {saving && <Loader2 className="size-4 animate-spin" />} Save photo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Draw the chosen crop region (in source pixels) onto a square canvas at the
// target size and export a compressed data URL — the "optimize on the fly" step,
// so a multi-MB upload becomes a few-KB avatar (webp, or jpeg on iOS Safari).
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
