import { createHash } from "node:crypto"
import { env } from "../env.js"

export const imagesEnabled = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
)

export const MAX_IMAGES_PER_POST = 4
const ALLOWED_FORMATS = "jpg,jpeg,png,webp,gif"

/** Cloudinary's signature: sorted name=value pairs joined by &, plus the API secret, SHA-1. */
function sign(params: Record<string, string | number>) {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&")
  return createHash("sha1").update(payload + env.CLOUDINARY_API_SECRET).digest("hex")
}

/** Each person uploads into their own folder, so they can only attach their own uploads. */
export const userFolder = (userId: string) => `${env.CLOUDINARY_FOLDER.replace(/\/+$/, "")}/${userId}`

/** What the browser needs to upload one image straight to Cloudinary. Valid for about an hour. */
export function uploadTicket(userId: string) {
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder: userFolder(userId),
    timestamp: Math.floor(Date.now() / 1000),
  }
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    apiKey: env.CLOUDINARY_API_KEY,
    signature: sign(params),
    ...params,
  }
}

export interface ImageRef {
  publicId: string
  url: string
  width: number
  height: number
}

/** True only for an image this person uploaded to our Cloudinary account. */
export function isOwnUpload(img: ImageRef, userId: string) {
  const folder = userFolder(userId)
  if (!img.publicId.startsWith(`${folder}/`) || !/^[A-Za-z0-9/_-]+$/.test(img.publicId)) return false
  const escaped = img.publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const cloud = env.CLOUDINARY_CLOUD_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`^https://res\\.cloudinary\\.com/${cloud}/image/upload/v\\d+/${escaped}\\.(jpg|jpeg|png|webp|gif)$`).test(
    img.url,
  )
}

/** Removes files from Cloudinary after their post is deleted. Failures are logged, never thrown. */
export async function destroyImages(publicIds: string[]) {
  if (!imagesEnabled) return
  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) }
        const body = new URLSearchParams({
          ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
          api_key: env.CLOUDINARY_API_KEY,
          signature: sign(params),
        })
        const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
          method: "POST",
          body,
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) console.warn(`Cloudinary destroy failed for ${publicId}: HTTP ${res.status}`)
      } catch (err) {
        console.warn(`Cloudinary destroy failed for ${publicId}:`, (err as Error).message)
      }
    }),
  )
}
