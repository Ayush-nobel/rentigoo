import { AlertCircle, ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { LISTING_LIMITS } from '@shared/listingRules'
import { Button } from '@/components/ui/Button'
import { ListingImage } from '@/components/ui/ListingImage'
import { api } from '@/lib'
import { preparePhoto } from '@/lib/photos'
import { cx } from '@/lib/cx'
import type { FormPhoto } from './form'

interface Props {
  photos: FormPhoto[]
  /** Functional updates, because uploads finish one by one. */
  update: (fn: (photos: FormPhoto[]) => FormPhoto[]) => void
  error?: string
  /** Called with keys uploaded this visit that were removed again. */
  onDiscard: (keys: string[]) => void
}

/**
 * Add photos by picking or dropping them. Each one is resized to WebP in the
 * browser (which also strips the phone's location data), uploaded, and needs
 * a short description for people using screen readers. The first photo is
 * the cover; arrow buttons reorder them.
 */
export function PhotoUploader({ photos, update, error, onDiscard }: Props) {
  const inputId = useId()
  const errorId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const room = LISTING_LIMITS.photosMax - photos.length

  const set = (id: string, patch: Partial<FormPhoto>) => update((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  async function addFiles(list: FileList | File[]) {
    const files = [...list].slice(0, Math.max(0, room))
    const skipped = list.length - files.length
    if (!files.length) {
      setAnnouncement(`You already have ${LISTING_LIMITS.photosMax} photos, the most a listing can have.`)
      return
    }
    const added: FormPhoto[] = files.map(() => ({ id: crypto.randomUUID(), alt: '', state: 'preparing', fresh: true }))
    update((ps) => [...ps, ...added])
    setAnnouncement(
      `Adding ${files.length} ${files.length === 1 ? 'photo' : 'photos'}.` + (skipped > 0 ? ` ${skipped} left out: a listing can have ${LISTING_LIMITS.photosMax}.` : ''),
    )
    await Promise.all(
      files.map(async (file, i) => {
        const id = added[i]!.id
        try {
          const prepared = await preparePhoto(file)
          set(id, { state: 'uploading', preview: URL.createObjectURL(prepared.blob) })
          const key = await api.uploadListingPhoto(prepared)
          set(id, { state: 'ready', key })
        } catch (e) {
          set(id, { state: 'failed', error: e instanceof Error && /photo|file|MB|browser/i.test(e.message) ? e.message : 'This photo didn’t upload. Check your connection and try again.' })
        }
      }),
    )
    setAnnouncement('Photos ready. Add a short description to each one.')
  }

  function remove(p: FormPhoto, index: number) {
    update((ps) => ps.filter((x) => x.id !== p.id))
    if (p.fresh && p.key) onDiscard([p.key])
    setAnnouncement(`Photo ${index + 1} removed.`)
    // Keep focus somewhere sensible: the next photo's remove button, or the add button.
    requestAnimationFrame(() => {
      const next = document.querySelector<HTMLElement>(`[data-photo-remove="${Math.min(index, photos.length - 2)}"]`)
      ;(next ?? input.current)?.focus()
    })
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by
    update((ps) => {
      const next = [...ps]
      const [p] = next.splice(index, 1)
      next.splice(to, 0, p!)
      return next
    })
    setAnnouncement(`Photo moved to position ${to + 1} of ${photos.length}.${to === 0 ? ' It’s now the cover photo.' : ''}`)
    // Follow the photo; if it reached the end, its button in that direction is disabled, so use the other one.
    requestAnimationFrame(() => {
      const same = document.querySelector<HTMLButtonElement>(`[data-photo-move="${to}:${by}"]`)
      ;(same && !same.disabled ? same : document.querySelector<HTMLButtonElement>(`[data-photo-move="${to}:${-by}"]`))?.focus()
    })
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files)
        }}
        className={cx(
          'flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed px-5 py-8 text-center transition-colors',
          dragging ? 'border-text bg-sunken' : 'border-line-strong bg-surface',
          room <= 0 && 'opacity-60',
        )}
      >
        <ImagePlus aria-hidden="true" className="size-9" strokeWidth={1.5} />
        <div>
          <input
            ref={input}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={room <= 0}
            aria-describedby={error ? errorId : undefined}
            className="peer sr-only"
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <label
            htmlFor={inputId}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 font-semibold text-on-ink hover:opacity-90 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:[outline-color:var(--focus)] peer-disabled:cursor-not-allowed"
          >
            {photos.length ? 'Add more photos' : 'Choose photos'}
          </label>
        </div>
        <p className="text-[0.9375rem] text-muted">
          {room > 0
            ? `Or drop them here. Up to ${LISTING_LIMITS.photosMax} photos; JPG, PNG or WebP. Daylight and a plain background work best.`
            : `That’s ${LISTING_LIMITS.photosMax} photos, the most a listing can have.`}
        </p>
      </div>
      {error && (
        <p id={errorId} className="mt-2 flex items-start gap-2 font-medium text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {photos.length > 0 && (
        <ol className="mt-6 space-y-4">
          {photos.map((p, i) => (
            <li key={p.id} className="grid gap-4 rounded-[20px] border border-line bg-surface p-4 sm:grid-cols-[9rem_1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sunken sm:aspect-square">
                {p.preview ? (
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                ) : p.key ? (
                  <ListingImage photo={{ key: p.key, alt: '' }} decorative />
                ) : null}
                {(p.state === 'preparing' || p.state === 'uploading') && (
                  <div className="absolute inset-0 grid place-items-center bg-bg/70">
                    <Loader2 aria-hidden="true" className="size-7 animate-spin motion-reduce:animate-none" />
                  </div>
                )}
                {i === 0 && p.state === 'ready' && (
                  <span className="absolute top-2 left-2 rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-on-accent">Cover</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold">
                  Photo {i + 1}
                  {i === 0 ? ' (cover)' : ''}
                  <span className="font-normal text-muted">
                    {p.state === 'preparing' ? ': preparing…' : p.state === 'uploading' ? ': uploading…' : ''}
                  </span>
                </p>
                {p.state === 'failed' && <p className="mt-1 font-medium text-danger">{p.error}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ArrowUp aria-hidden="true" className="size-4" />}
                    disabled={i === 0}
                    data-photo-move={`${i}:-1`}
                    aria-label={`Move photo ${i + 1} earlier`}
                    onClick={() => move(i, -1)}
                  >
                    Earlier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ArrowDown aria-hidden="true" className="size-4" />}
                    disabled={i === photos.length - 1}
                    data-photo-move={`${i}:1`}
                    aria-label={`Move photo ${i + 1} later`}
                    onClick={() => move(i, 1)}
                  >
                    Later
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 aria-hidden="true" className="size-4" />}
                    data-photo-remove={i}
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => remove(p, i)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
