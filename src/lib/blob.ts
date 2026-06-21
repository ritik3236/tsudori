import "server-only"

import { put, del } from "@vercel/blob"

// Vercel Blob storage. Paths are tenant-grouped under tsudori/<env>/<instituteId>/…
// so a tenant's assets can be swept in one prefix on offboarding. `env` is `prod`
// on production and `dev` everywhere else (local + preview), matching the two
// folders in the store. Token is server-only. The store is connected to Vercel
// with a TSUDORI_ prefix (so prod/preview only expose TSUDORI_BLOB_READ_WRITE_TOKEN);
// the unprefixed name is the local-dev fallback.
const ENV_FOLDER = process.env.VERCEL_ENV === "production" ? "prod" : "dev"
const TOKEN =
  process.env.TSUDORI_BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN

export function blobPath(...parts: string[]): string {
  return ["tsudori", ENV_FOLDER, ...parts].join("/")
}

/** Upload a public image blob; returns its URL. Path already carries a unique
 *  suffix (so no random suffix), and access is public so <img> can load it. */
export async function putPublicImage(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const blob = await put(path, data, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    token: TOKEN,
  })
  return blob.url
}

/** Best-effort delete — a failed cleanup must not break the user's action. */
export async function deleteBlob(url: string): Promise<void> {
  try {
    await del(url, { token: TOKEN })
  } catch {
    // ignore: the DB no longer references it; an orphaned blob is harmless
  }
}
