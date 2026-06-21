"use client"

import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth/client"
import { AvatarUploader } from "@/components/shared/avatar-uploader"
import { uploadAvatar } from "@/features/account/photo-actions"

/**
 * The signed-in user's profile picture. Uploads to Blob, then points the Neon
 * Auth user's `image` at it via `authClient.updateUser` and refreshes so the new
 * picture shows wherever the avatar is read (the audit log, the team list, here).
 */
export function ProfilePhoto({
  name,
  imageUrl,
}: {
  name: string
  imageUrl: string | null
}) {
  const router = useRouter()

  return (
    <AvatarUploader
      name={name}
      imageUrl={imageUrl}
      canEdit
      className="size-20"
      fallbackClassName="text-2xl"
      noun="Profile picture"
      onUpload={async (dataUrl) => {
        const { url } = await uploadAvatar(dataUrl)
        const { error } = await authClient.updateUser({ image: url })
        if (error) throw new Error(error.message ?? "Update failed")
        router.refresh()
        return url
      }}
      onRemove={async () => {
        const { error } = await authClient.updateUser({ image: "" })
        if (error) throw new Error(error.message ?? "Update failed")
        router.refresh()
      }}
    />
  )
}
