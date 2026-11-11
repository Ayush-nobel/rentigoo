import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

const s3 = new S3Client({})

/** Deletes listing photo files from the photos bucket (PHOTO_BUCKET env). */
export function photoBucket() {
  const Bucket = process.env.PHOTO_BUCKET
  async function deleteKeys(keys: string[]) {
    if (!Bucket) throw new Error('PHOTO_BUCKET missing')
    for (let i = 0; i < keys.length; i += 1000) {
      await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }))
    }
  }
  return {
    deletePhotos: deleteKeys,
    async deletePhotoFolders(prefixes: string[]) {
      if (!Bucket) throw new Error('PHOTO_BUCKET missing')
      for (const Prefix of prefixes) {
        if (!/^listing-photos\/[\w-]+:[0-9a-f-]{36}\/$/.test(Prefix)) continue // never anything wider than one person's folder
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
