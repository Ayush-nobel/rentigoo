import { Camera, Check, ImagePlus, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { CONDITION_CHECKS, CONDITION_LIMITS, conditionProblem, type ConditionCheckId, type ConditionReportView, type ConditionStage } from '@shared/conditionReports'
import type { Booking } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { TextAreaField } from '@/components/ui/Field'
import { api, ApiError } from '@/lib'
import { preparePhoto } from '@/lib/photos'
import { shortDate } from '@/lib/format'

const STAGE_NAME: Record<ConditionStage, string> = { pickup: 'Pickup check', return: 'Return check' }

/**
 * Pickup and return checks on a booking card: a short checklist and photos from
 * each side, recorded at handover and at return. Both people see both. It's
 * what a damage disagreement is judged on. Loads when opened.
 */
export function ConditionChecks({ booking, myId, otherName }: { booking: Booking; myId: string; otherName: string }) {
  const [open, setOpen] = useState(false)
  const [reports, setReports] = useState<ConditionReportView[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ConditionStage | null>(null)
  const stages = (['pickup', 'return'] as const).filter((s) => !conditionProblem(booking, s))

  const load = async () => {
    setLoadError(null)
    try {
      setReports(await api.listConditionReports(booking.id))
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'The checks didn’t load. Try again.')
    }
  }

  if (!stages.length) return null
  return (
    <details
      className="mt-4 rounded-xl bg-sunken px-4 py-3"
      onToggle={(e) => {
        const isOpen = (e.target as HTMLDetailsElement).open
        setOpen(isOpen)
        if (isOpen && !reports) void load()
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded font-semibold">
        <Camera aria-hidden="true" className="size-5" /> Pickup and return photos
      </summary>
      {open && (
        <div className="mt-2 space-y-5 pb-2">
          <p className="text-[0.9375rem] text-muted">
            Take photos together at handover and at return. If there’s ever a disagreement about damage, these are what we look at. Only you and {otherName} can see them,
            and they’re deleted {CONDITION_LIMITS.keepDaysAfterEnd} days after the rental ends.
          </p>
          {loadError && (
            <p role="alert" className="text-danger">
              {loadError}{' '}
              <button type="button" onClick={() => void load()} className="min-h-11 font-semibold underline underline-offset-4">
                Try again
              </button>
            </p>
          )}
          {!reports && !loadError && <p className="text-muted">Loading…</p>}
          {reports &&
            stages.map((stage) => {
              const here = reports.filter((r) => r.stage === stage)
              const mine = here.find((r) => r.authorId === myId)
              return (
                <section key={stage} aria-label={STAGE_NAME[stage]}>
                  <h4 className="font-semibold">{STAGE_NAME[stage]}</h4>
                  {here.length === 0 && editing !== stage && <p className="mt-1 text-[0.9375rem] text-muted">Nothing recorded yet.</p>}
                  {here.map((r) => (
                    <ReportView key={r.id} report={r} who={r.authorId === myId ? 'You' : otherName} />
                  ))}
                  {editing === stage ? (
                    <ReportForm
                      bookingId={booking.id}
                      stage={stage}
                      existing={mine}
                      onCancel={() => setEditing(null)}
                      onSaved={(saved) => {
                        setReports((rs) => [...(rs ?? []).filter((r) => r.id !== saved.id), saved])
                        setEditing(null)
                      }}
                    />
                  ) : (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing(stage)}>
                      {mine ? `Update your ${stage} check` : `Add your ${stage} check`}
                    </Button>
                  )}
                </section>
              )
            })}
        </div>
      )}
    </details>
  )
}

function ReportView({ report: r, who }: { report: ConditionReportView; who: string }) {
  return (
    <div className="mt-2 rounded-xl bg-surface p-3">
      <p className="text-[0.9375rem] font-semibold">
        {who}, {shortDate(r.createdAt.slice(0, 10))}
      </p>
      <ul className="mt-1 space-y-0.5 text-[0.9375rem]">
        {CONDITION_CHECKS.map((c) => (
          <li key={c.id} className="flex items-start gap-1.5">
            {r.checks[c.id] ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />}
            <span>
              <span className="sr-only">{r.checks[c.id] ? 'Yes: ' : 'No: '}</span>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
      {r.notes && <p className="mt-2 text-[0.9375rem]">“{r.notes}”</p>}
      {r.photos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {r.photos.map((p, i) => (
            <li key={p.key}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg">
                <img src={p.url} alt={`${who}’s photo ${i + 1} of ${r.photos.length}`} className="size-20 rounded-lg object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReportForm({
  bookingId,
  stage,
  existing,
  onCancel,
  onSaved,
}: {
  bookingId: string
  stage: ConditionStage
  existing?: ConditionReportView
  onCancel: () => void
  onSaved: (r: ConditionReportView) => void
}) {
  const inputId = useId()
  const [checks, setChecks] = useState<Record<ConditionCheckId, boolean>>(
    () => existing?.checks ?? (Object.fromEntries(CONDITION_CHECKS.map((c) => [c.id, false])) as Record<ConditionCheckId, boolean>),
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [photos, setPhotos] = useState<{ key: string; url: string }[]>(existing?.photos ?? [])
  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const room = CONDITION_LIMITS.photosMax - photos.length - uploading

  const add = async (files: FileList) => {
    setError(null)
    const picked = [...files].slice(0, Math.max(0, room))
    setUploading((n) => n + picked.length)
    for (const file of picked) {
      try {
        const prepared = await preparePhoto(file)
        const key = await api.uploadConditionPhoto(bookingId, prepared)
        setPhotos((ps) => [...ps, { key, url: URL.createObjectURL(prepared.blob) }])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That photo didn’t upload. Try again.')
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onSaved(await api.saveConditionReport({ bookingId, stage, checks, notes, photoKeys: photos.map((p) => p.key) }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your check wasn’t saved. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={save} className="mt-3 space-y-4 rounded-xl bg-surface p-4">
      <fieldset>
        <legend className="mb-1 font-semibold">Check together:</legend>
        {CONDITION_CHECKS.map((c) => (
          <Checkbox key={c.id} label={c.label} checked={checks[c.id]} onChange={(e) => setChecks((cs) => ({ ...cs, [c.id]: e.target.checked }))} />
        ))}
      </fieldset>
      <TextAreaField
        label="Notes"
        hint="Scratches, dents, missing parts, anything worth remembering"
        rows={3}
        maxLength={CONDITION_LIMITS.notesMax}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div>
        <p className="font-semibold">Photos</p>
        <p className="text-[0.9375rem] text-muted">Up to {CONDITION_LIMITS.photosMax}: the whole item, close-ups of any marks, and the accessories.</p>
        {photos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <li key={p.key} className="relative">
                <img src={p.url} alt={`Photo ${i + 1}`} className="size-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((ps) => ps.filter((x) => x.key !== p.key))}
                  className="absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-ink text-on-ink"
                >
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">Remove photo {i + 1}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={room <= 0}
          className="peer sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void add(e.target.files)
            e.target.value = ''
          }}
        />
        <label
          htmlFor={inputId}
          className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 font-semibold text-on-ink hover:opacity-90 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:[outline-color:var(--focus)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
        >
          <ImagePlus aria-hidden="true" className="size-5" />
          {uploading ? `Uploading ${uploading}…` : 'Take or choose photos'}
        </label>
      </div>
      {error && (
        <p role="alert" className="font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={saving || uploading > 0}>
          {saving ? 'Saving…' : 'Save check'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
