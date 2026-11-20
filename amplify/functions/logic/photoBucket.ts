import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'

const s3 = new S3Client({})

/** Listing photo files in the photos bucket (PHOTO_BUCKET env): signed uploads, counting and deleting. */
export function photoBucket(cacheControl = 'public, max-age=31536000, immutable') {
  const Bucket = process.env.PHOTO_BUCKET
  async function deleteKeys(keys: string[]) {
    if (!Bucket) throw new Error('PHOTO_BUCKET missing')
    for (let i = 0; i < keys.length; i += 1000) {
      await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }))
    }
  }
  return {
    deletePhotos: deleteKeys,
    async countPhotos(folder: string, upTo: number) {
      if (!Bucket) throw new Error('PHOTO_BUCKET missing')
      const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: folder, MaxKeys: upTo }))
      return page.KeyCount ?? 0
    },
    async presignUpload(key: string, contentType: string, maxBytes: number, validSeconds: number) {
      if (!Bucket) throw new Error('PHOTO_BUCKET missing')
      // S3 itself refuses anything but this key, this type and this size, so a
      // changed browser can't upload something else.
      return createPresignedPost(s3, {
        Bucket,
        Key: key,
        Conditions: [['content-length-range', 1, maxBytes]],
        // Each upload gets a new name, so browsers can keep it for good.
        Fields: { 'Content-Type': contentType, 'Cache-Control': cacheControl },
        Expires: validSeconds,
      })
    },
    async deletePhotoFolders(prefixes: string[]) {
      if (!Bucket) throw new Error('PHOTO_BUCKET missing')
      for (const Prefix of prefixes) {
        if (!/^((listing|condition)-photos|listing-receipts)\/[\w-]{1,64}\/$/.test(Prefix)) continue // never anything wider than one person's folder
        let token: string | undefined
        do {
          const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken: token }))
          const keys = (page.Contents ?? []).map((o) => o.Key!).filter(Boolean)
          if (keys.length) await deleteKeys(keys)
          token = page.NextContinuationToken
        } while (token)
      }
    },
  }
}

/** Original bills: private files nobody can read from the browser. */
export function receiptBucket() {
  const Bucket = process.env.PHOTO_BUCKET
  return {
    ...photoBucket('private, no-store'),
    async receiptExists(key: string) {
      if (!Bucket) throw new Error('PHOTO_BUCKET missing')
      try {
        await s3.send(new HeadObjectCommand({ Bucket, Key: key }))
        return true
      } catch {
        return false
      }
    },
    async listReceiptFiles() {
      if (!Bucket) throw new Error('PHOTO_BUCKET missing')
      const out: { key: string; uploadedAt: Date }[] = []
      let token: string | undefined
      do {
        const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: 'listing-receipts/', ContinuationToken: token }))
        for (const o of page.Contents ?? []) if (o.Key) out.push({ key: o.Key, uploadedAt: o.LastModified ?? new Date() })
        token = page.NextContinuationToken
      } while (token)
      return out
    },
  }
}

/** Pickup and return check photos: private files, only ever shown through links that expire. */
export function conditionBucket() {
  const Bucket = process.env.PHOTO_BUCKET
  return {
    ...photoBucket('private, max-age=600'),
    async viewUrl(key: string) {
      if (!Bucket) throw new Error('PHOTO_BUCKET missing')
      return getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 900 })
    },
  }
}
