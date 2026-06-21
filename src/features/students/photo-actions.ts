"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { blobPath, putPublicImage, deleteBlob } from "@/lib/blob"
import { nowEpochMs } from "@/lib/date-helper"

// The client resizes to a ~256px image (a few KB) before upload; this is just a
// safety cap against a malformed/oversized payload reaching the action.
const MAX_BYTES = 600_000

// Accepted upload formats. The client encodes to webp, falling back to jpeg on
// browsers without canvas webp support (iOS Safari). Each maps to its blob
// content-type, file extension, and a magic-byte check on the decoded bytes —
// this action takes client-supplied input directly, so we don't trust the prefix.
const FORMATS = [
  {
    prefix: "data:image/webp;base64,",
    ext: "webp",
    contentType: "image/webp",
    // RIFF....WEBP
    isValid: (b: Buffer) =>
      b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    prefix: "data:image/jpeg;base64,",
    ext: "jpg",
    contentType: "image/jpeg",
    // SOI marker FF D8 FF
    isValid: (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
] as const

/** Set a student's profile photo from a base64 webp/jpeg data URL. Uploads to
 *  Blob, points the row at the new URL, then deletes the previous blob. */
export async function setStudentPhoto(
  studentId: string,
  dataUrl: string
): Promise<{ photoUrl: string }> {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_UPDATE)

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId: ctx.institute.id },
    select: { id: true, photoUrl: true },
  })
  if (!student) throw new NotFoundError("Student not found.")

  const format = FORMATS.find((f) => dataUrl.startsWith(f.prefix))
  if (!format) throw new ValidationError("Invalid image.")
  const buffer = Buffer.from(dataUrl.slice(format.prefix.length), "base64")
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new ValidationError("Image is too large.")
  }
  if (!format.isValid(buffer)) throw new ValidationError("Invalid image.")

  const path = blobPath(
    ctx.institute.id,
    "students",
    `${studentId}-${nowEpochMs()}.${format.ext}`
  )
  const url = await putPublicImage(path, buffer, format.contentType)
  await prisma.student.update({ where: { id: student.id }, data: { photoUrl: url } })
  if (student.photoUrl) await deleteBlob(student.photoUrl)

  revalidatePath(`/students/${studentId}`)
  return { photoUrl: url }
}

/** Clear a student's profile photo and delete the blob. */
export async function removeStudentPhoto(studentId: string): Promise<void> {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.STUDENT_UPDATE)

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId: ctx.institute.id },
    select: { id: true, photoUrl: true },
  })
  if (!student) throw new NotFoundError("Student not found.")
  if (!student.photoUrl) return

  await prisma.student.update({ where: { id: student.id }, data: { photoUrl: null } })
  await deleteBlob(student.photoUrl)
  revalidatePath(`/students/${studentId}`)
}
