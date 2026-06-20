"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getTenantContext, requirePermission } from "@/lib/tenant"
import { PERMISSIONS } from "@/lib/rbac"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { blobPath, putPublicImage, deleteBlob } from "@/lib/blob"

// The client resizes to a ~256px webp (a few KB) before upload; this is just a
// safety cap against a malformed/oversized payload reaching the action.
const MAX_BYTES = 600_000
const WEBP_PREFIX = "data:image/webp;base64,"

/** Set a student's profile photo from a base64 webp data URL. Uploads to Blob,
 *  points the row at the new URL, then deletes the previous blob. */
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

  if (!dataUrl.startsWith(WEBP_PREFIX)) throw new ValidationError("Invalid image.")
  const buffer = Buffer.from(dataUrl.slice(WEBP_PREFIX.length), "base64")
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new ValidationError("Image is too large.")
  }
  // Validate real WebP content (RIFF…WEBP magic bytes), not just the data-URL
  // prefix — this action is directly callable with client-supplied input.
  const isWebp =
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  if (!isWebp) throw new ValidationError("Invalid image.")

  const path = blobPath(ctx.institute.id, "students", `${studentId}-${Date.now()}.webp`)
  const url = await putPublicImage(path, buffer, "image/webp")
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
