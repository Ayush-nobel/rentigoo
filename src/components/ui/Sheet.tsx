import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Element to focus again when the sheet closes (usually the button that opened it). */
  returnFocusTo?: RefObject<HTMLElement | null>
}

/**
 * Bottom sheet on native <dialog>: the browser handles focus trapping,
 * Esc to close and returning focus to whatever opened it.
 */
export function Sheet({ open, onClose, title, children, footer, returnFocusTo }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Fires however it closes: Esc, the X, the backdrop or the parent setting open=false.
      onClose={() => {
        onClose()
        returnFocusTo?.current?.focus()
      }}
      onClick={(e) => e.target === ref.current && onClose()} // tap on the backdrop
      className="sheet m-0 mt-auto flex max-h-[88dvh] w-full max-w-none flex-col rounded-t-[28px] bg-surface p-0 text-text backdrop:bg-black/50 open:flex [&:not([open])]:hidden"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id={titleId} className="text-2xl">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-sunken" aria-label="Close">
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      {footer && <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </dialog>
  )
}
