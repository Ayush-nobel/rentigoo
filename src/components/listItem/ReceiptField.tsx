import { AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { useId } from 'react'
import { POLICY } from '@shared/policy'
import { api } from '@/lib'
import { rupees } from '@/lib/format'
import { preparePhoto } from '@/lib/photos'
import type { FormReceipt } from './form'

interface Props {
  receipt: FormReceipt | null
  /** The saved listing already has a bill on file. */
  hasReceipt: boolean
  error?: string
  onChange: (r: FormReceipt | null) => void
}

const PDF_MAX = 5 * 1024 * 1024

/**
 * The original bill for an item that cost more than ₹5,000. Photos are resized
 * to WebP in the browser (which also drops location data); PDFs go as they are.
 * Stored privately: only RentiGoo can open it, never renters.
 */
export function ReceiptField({ receipt, hasReceipt, error, onChange }: Props) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()

  async function add(file: File) {
    // A bill added earlier in this visit and now replaced isn't kept.
    if (receipt?.key) void api.discardListingPhotos([receipt.key])
    onChange({ name: file.name, state: 'uploading' })
    try {
      let key: string
      if (file.type === 'application/pdf') {
        if (file.size > PDF_MAX) throw new Error('That PDF is over 5 MB. Choose a smaller one, or take a photo of the bill.')
        key = await api.uploadListingReceipt({ blob: file, ext: 'pdf' })
      } else {
        key = await api.uploadListingReceipt(await preparePhoto(file))
      }
      onChange({ name: file.name, state: 'ready', key })
    } catch (e) {
      const message = e instanceof Error && /photo|file|PDF|MB|bill/i.test(e.message) ? e.message : 'The bill didn’t upload. Check your connection and try again.'
      onChange({ name: file.name, state: 'failed', error: message })
    }
  }

  const status =
    receipt?.state === 'uploading' ? (
      <span className="flex items-center gap-2">
        <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
        Uploading {receipt.name}…
      </span>
    ) : receipt?.state === 'ready' ? (
      <span className="flex items-center gap-2">
        <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success" />
        {receipt.name} added
      </span>
    ) : hasReceipt ? (
      <span className="flex items-center gap-2">
        <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success" />
        Bill on file. Add a new one only to replace it.
      </span>
    ) : null

  return (
    <div className="card rounded-[20px] p-4 sm:p-5">
      <p className="flex items-center gap-2 font-semibold">
        <FileText aria-hidden="true" className="size-5" />
        Original bill or receipt
      </p>
      <p id={hintId} className="mt-1 text-[0.9375rem] text-muted">
        Needed because it cost more than {rupees(POLICY.receiptAbove)}. A clear photo or a PDF. It’s kept private: only RentiGoo sees it, to settle a damage
        claim fairly. It’s deleted when you delete the listing.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          aria-describedby={[hintId, error ? errorId : ''].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          disabled={receipt?.state === 'uploading'}
          className="peer sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void add(f)
            e.target.value = ''
          }}
        />
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink px-5 font-semibold hover:bg-sunken peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:[outline-color:var(--focus)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
        >
          {receipt?.state === 'ready' || hasReceipt ? 'Replace the bill' : 'Add the bill'}
        </label>
        <p role="status" className="min-w-0 break-words">
          {status}
        </p>
      </div>
      {error && (
        <p id={errorId} className="mt-2 flex items-start gap-2 font-medium text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
