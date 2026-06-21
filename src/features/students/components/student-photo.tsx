"use client"

import { AvatarUploader } from "@/components/shared/avatar-uploader"
import { setStudentPhoto, removeStudentPhoto } from "@/features/students/photo-actions"

type Props = {
  studentId: string
  fullName: string
  photoUrl: string | null
  canEdit: boolean
}

export function StudentPhoto({ studentId, fullName, photoUrl, canEdit }: Props) {
  return (
    <AvatarUploader
      name={fullName}
      imageUrl={photoUrl}
      canEdit={canEdit}
      onUpload={async (dataUrl) => (await setStudentPhoto(studentId, dataUrl)).photoUrl}
      onRemove={() => removeStudentPhoto(studentId)}
    />
  )
}
