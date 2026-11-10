import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Photo } from '@shared/types'
import { cx } from '@/lib/cx'
import { ListingImage } from '../ui/ListingImage'

interface Props {
  photos: Photo[]
  title: string
}

/**
 * Phones: a swipeable strip. Larger screens: one big photo with up to four
 * beside it. Any photo opens a full-screen viewer (arrow keys, Esc).
 */
export function PhotoGallery({ photos, title }: Props) {
  const [open, setOpen] = useState<number | null>(null)
  const [current, setCurrent] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)

  if (!photos.length) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-photo">
        <ListingImage photo={undefined} />
      </div>
    )
  }

  const onStripScroll = () => {
    const el = stripRef.current
    if (el) setCurrent(Math.round(el.scrollLeft / el.clientWidth))
  }
  const label = (i: number) => `View photo ${i + 1} of ${photos.length}: ${photos[i]!.alt}`

  return (
    <>
      {/* Phones: swipe strip */}
      <div className="relative -mx-4 md:hidden">
        <div
          ref={stripRef}
          onScroll={onStripScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((p, i) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={label(i)}
              className="aspect-[4/3] w-full shrink-0 snap-center"
            >
              <ListingImage photo={p} decorative priority={i === 0} />
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <p aria-hidden="true" className="absolute right-6 bottom-3 rounded-full bg-ink/80 px-2.5 py-0.5 text-sm font-semibold text-on-ink">
            {current + 1} / {photos.length}
          </p>
        )}
      </div>

      {/* Tablets and up: mosaic */}
      <div
        className={cx(
          'hidden gap-2 overflow-hidden rounded-photo md:grid',
          photos.length === 1 ? 'grid-cols-1' : 'aspect-[2/1] grid-cols-4 grid-rows-2',
        )}
      >
        {photos.slice(0, 5).map((p, i) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={label(i)}
            className={cx(
              'relative overflow-hidden',
              photos.length === 1 && 'aspect-[16/9]',
              photos.length > 1 && i === 0 && 'col-span-2 row-span-2',
              photos.length === 2 && i === 1 && 'col-span-2 row-span-2',
              photos.length === 3 && i > 0 && 'col-span-2',
              photos.length === 4 && i === 1 && 'col-span-2',
            )}
          >
            <ListingImage photo={p} decorative priority={i === 0} className="transition-transform duration-500 hover:scale-[1.02]" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="mt-3 hidden min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-semibold hover:border-text md:inline-flex"
        >
          <Images aria-hidden="true" className="size-5" /> See all {photos.length} photos
        </button>
      )}

      {open !== null && <Lightbox photos={photos} title={title} start={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function Lightbox({ photos, title, start, onClose }: { photos: Photo[]; title: string; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [i, setI] = useState(start)
  const n = photos.length

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const go = (d: number) => setI((x) => (x + d + n) % n)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1)
    if (e.key === 'ArrowLeft') go(-1)
  }
  const photo = photos[i]!
  const navBtn = 'grid size-12 place-items-center rounded-full bg-surface text-text shadow-card hover:bg-sunken disabled:opacity-40'

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={onKey}
      aria-label={`Photos of ${title}`}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-bg p-0 text-text backdrop:bg-black/70"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <p className="font-semibold" aria-live="polite">
            Photo {i + 1} of {n}
          </p>
          <button type="button" onClick={() => ref.current?.close()} className="grid size-11 place-items-center rounded-full hover:bg-sunken" aria-label="Close photos">
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
        <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 pb-6 sm:px-20">
          <div className="aspect-[4/3] max-h-full w-full max-w-4xl overflow-hidden rounded-photo">
            <ListingImage photo={photo} priority />
          </div>
          <figcaption className="text-center text-muted">{photo.alt}</figcaption>
        </figure>
        {n > 1 && (
          <div className="flex justify-center gap-4 pb-6 sm:pointer-events-none sm:absolute sm:inset-x-6 sm:top-1/2 sm:-translate-y-1/2 sm:justify-between sm:pb-0">
            <button type="button" onClick={() => go(-1)} className={cx(navBtn, 'sm:pointer-events-auto')} aria-label="Previous photo">
              <ChevronLeft aria-hidden="true" className="size-6" />
            </button>
            <button type="button" onClick={() => go(1)} className={cx(navBtn, 'sm:pointer-events-auto')} aria-label="Next photo">
              <ChevronRight aria-hidden="true" className="size-6" />
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
