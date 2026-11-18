import { LEGACY_PHOTO_KEY, PHOTO_KEY } from '@shared/listingRules'
import { outputs } from './outputs'

/** Longest side of an uploaded photo, in pixels. Plenty for a phone or a laptop screen. */
const MAX_SIDE = 1600

export interface PreparedPhoto {
  blob: Blob
  ext: 'webp' | 'jpg'
  width: number
  height: number
}

/**
 * Turns whatever the person picked into a web-sized WebP (JPEG where the
 * browser can't make WebP, e.g. older Safari). Redrawing the picture also drops
 * its hidden details, such as the GPS location phones store in photos.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) {
    throw new Error('That file isn’t a photo we can use. Choose a JPG, PNG or WebP picture.')
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('That photo is over 25 MB. Choose a smaller one.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('We couldn’t open that photo. Try another, or save it as a JPG first.')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser couldn’t prepare that photo. Please try again.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q))
  const webp = await toBlob('image/webp', 0.82)
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp', width, height }
  const jpg = await toBlob('image/jpeg', 0.85)
  if (!jpg) throw new Error('Your browser couldn’t prepare that photo. Please try again.')
  return { blob: jpg, ext: 'jpg', width, height }
}

/** Photos uploaded in demo mode only live in this tab. */
const localPhotos = new Map<string, string>()
export function rememberLocalPhoto(key: string, blob: Blob) {
  localPhotos.set(key, URL.createObjectURL(blob))
}

/**
 * Where to load a listing photo from. Uploaded photos are public files in the
 * photos bucket; other keys (full URLs) are used as they are. Returns
 * undefined when there's nothing to show (built-in illustrations, or a demo
 * photo from an earlier visit).
 */
export function photoSrc(key: string): string | undefined {
  if (key.startsWith('ph:')) return undefined
  if (PHOTO_KEY.test(key) || LEGACY_PHOTO_KEY.test(key)) {
    const local = localPhotos.get(key)
    if (local) return local
    const s = outputs?.storage
    // Demo mode never has real uploads (a demo photo from an earlier visit is gone).
    return import.meta.env.VITE_DATA_MODE === 'mock' || key.includes('/mock:') || !s ? undefined : `https://${s.bucket_name}.s3.${s.aws_region}.amazonaws.com/${key}`
  }
  return /^https:\/\//.test(key) ? key : undefined
}
