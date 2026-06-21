"use server"

import { getTenantContext } from "@/lib/tenant"
import { ValidationError } from "@/lib/errors"
import { blobPath, putPublicImage, deleteBlob } from "@/lib/blob"
import { nowEpochMs } from "@/lib/date-helper"

// The client resizes to a ~256px image (a few KB) before upload; this is just a
// safety cap against a malformed/oversized payload reaching the action.
const MAX_BYTES = 600_000

// Accepted upload formats — the client encodes to webp, falling back to jpeg on
// browsers without canvas webp support (iOS Safari). We take client-supplied
// input directly, so each format is checked by magic bytes, not the prefix.
// (Mirrors the student photo action's boundary check.)
const FORMATS = [
  {
    prefix: "data:image/webp;base64,",
    ext: "webp",
    contentType: "image/webp",
    isValid: (b: Buffer) =>
      b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    prefix: "data:image/jpeg;base64,",
    ext: "jpg",
    contentType: "image/jpeg",
    isValid: (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
] as const

/**
 * Upload the signed-in user's avatar from a base64 webp/jpeg data URL and return
 * its public URL. The caller then points the Neon Auth user at it via
 * `authClient.updateUser({ image })`. Replacing drops the previous uploaded blob
 * (best-effort; a non-blob image such as a Google avatar is left alone).
 */
export async function uploadAvatar(dataUrl: string): Promise<{ url: string }> {
  const ctx = await getTenantContext()

  const format = FORMATS.find((f) => dataUrl.startsWith(f.prefix))
  if (!format) throw new ValidationError("Invalid image.")
  const buffer = Buffer.from(dataUrl.slice(format.prefix.length), "base64")
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new ValidationError("Image is too large.")
  }
  if (!format.isValid(buffer)) throw new ValidationError("Invalid image.")

  const path = blobPath("users", `${ctx.user.id}-${nowEpochMs()}.${format.ext}`)
  const url = await putPublicImage(path, buffer, format.contentType)

  if (ctx.user.image?.includes("blob.vercel-storage.com")) {
    await deleteBlob(ctx.user.image)
  }
  return { url }
}
