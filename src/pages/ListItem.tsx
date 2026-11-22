import { IdGate } from '@/components/account/IdGate'
import { useIdNeeded } from '@/hooks/useIdNeeded'
import { motion } from 'framer-motion'
import { AlertCircle, Check, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useBlocker, useLocation, useNavigate, useSearchParams } from 'react-router'
import { AREAS, areaName, LAUNCH_CITY } from '@shared/areas'
import { CATEGORIES, categoryName, getCategory } from '@shared/categories'
import { FEES } from '@shared/fees'
import { CONDITIONS, LISTING_LIMITS, type ListingErrors } from '@shared/listingRules'
import { bestRent } from '@shared/pricing'
import { depositCap, needsReceipt, POLICY } from '@shared/policy'
import type { Listing, ListingStatus } from '@shared/types'
import { PageLoading } from '@/components/layout/AppShell'
import { Seo } from '@/components/layout/Seo'
import { BlockDates } from '@/components/listItem/BlockDates'
import { allErrors, emptyForm, formFromListing, STEPS, stepErrors, toDraft, type FormPhoto, type ListingForm, type StepId } from '@/components/listItem/form'
import { PhotoUploader } from '@/components/listItem/PhotoUploader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox, Radio } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/Feedback'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { ReceiptField } from '@/components/listItem/ReceiptField'
import { ListingImage } from '@/components/ui/ListingImage'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { api, ApiError } from '@/lib'
import { cx } from '@/lib/cx'
import { plural, rupees, todayIST } from '@/lib/format'

export default function ListItem() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const location = useLocation()
  const existing = useAsync(() => (editId ? api.getListing(editId) : Promise.resolve(null)), [editId])

  // Until it has loaded, `existing` can still hold the listing from before the URL changed.
  const listing = editId && existing.data?.id === editId ? existing.data : null

  if (!user) return null
  if (existing.status === 'loading' || (editId && existing.status === 'success' && !listing && existing.data)) return <PageLoading />
  if (editId && (existing.status === 'error' || !listing || listing.ownerId !== user.id)) {
    return (
      <>
        <Seo title="Listing not found" description="" noindex />
        <EmptyState title="We couldn’t find that listing" action={<ButtonLink to="/list">List a new item</ButtonLink>}>
          It may have been deleted, or it belongs to someone else.
        </EmptyState>
      </>
    )
  }
  // A fresh form for each visit (e.g. "List another item"), and when switching to editing. Moving between
  // steps carries the session along in history state, so the form (and what's typed in it) survives.
  const session = (location.state as StepState | null)?.listSession ?? location.key
  return <Editor key={editId ?? session} session={session} listing={listing} defaultArea={user.areaId} />
}

/** History state for a step of the form: which form it belongs to, and the step of the entry before it. */
interface StepState {
  listSession?: string
  fromStep?: number
}

function Editor({ listing, defaultArea, session }: { listing: Listing | null; defaultArea: string; session: string }) {
  const today = todayIST()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState<ListingForm>(() => (listing ? formFromListing(listing) : emptyForm(defaultArea)))
  const [reached, setReached] = useState(listing ? STEPS.length - 1 : 0)
  // Each step is its own history entry (?step=photos), so the browser's back button goes to the previous step.
  const stepInUrl = STEPS.findIndex((s) => s.id === new URLSearchParams(location.search).get('step'))
  const step = Math.min(Math.max(stepInUrl, 0), reached)
  const cameFrom = (location.state as StepState | null)?.fromStep
  // Problems found when trying to move on; each one disappears as soon as it's fixed.
  const [flagged, setErrors] = useState<ListingErrors>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState<ListingStatus | null>(null)
  const idNeeded = useIdNeeded()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Listing | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const errorBox = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  const knownKeys = useMemo(() => listing?.photos.map((p) => p.key) ?? [], [listing])
  const booked = useMemo(() => {
    if (!listing?.ownerBlockedDates) return []
    const own = new Set(listing.ownerBlockedDates)
    return listing.blockedDates.filter((d) => !own.has(d))
  }, [listing])
  const current = STEPS[step]!
  const errors = useMemo(() => {
    const keys = Object.keys(flagged) as (keyof ListingErrors)[]
    if (!keys.length) return flagged
    const now = stepErrors(form, current.id, today, knownKeys)
    const out: ListingErrors = {}
    for (const k of keys) if (now[k]) out[k] = now[k]
    return out
  }, [flagged, form, current.id, today, knownKeys])

  const edit = (patch: Partial<ListingForm>) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }
  const updatePhotos = (fn: (ps: FormPhoto[]) => FormPhoto[]) => {
    setForm((f) => ({ ...f, photos: fn(f.photos) }))
    setDirty(true)
  }

  // Move focus to the new step's heading, so keyboard and screen reader users start at the top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
    window.scrollTo({ top: 0 })
  }, [step, saved])

  // Leaving with unsaved changes asks first.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saved && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Leave without saving? Your listing details will be lost.')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!dirty || saved) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saved])

  // A message about saving belongs to the step it was shown on.
  const [errorStep, setErrorStep] = useState(step)
  if (errorStep !== step) {
    setErrorStep(step)
    setSaveError(null)
  }

  const goTo = (i: number) => {
    setErrors({})
    setSaveError(null)
    setReached((r) => Math.max(r, i))
    if (i === step) return
    // Going back to the step we came from: use the existing history entry rather than adding one.
    if (i === cameFrom) return void navigate(-1)
    const p = new URLSearchParams(location.search)
    if (i === 0) p.delete('step')
    else p.set('step', STEPS[i]!.id)
    const back = i < step
    navigate({ search: p.size ? `?${p}` : '' }, { replace: back, state: { listSession: session, fromStep: back ? cameFrom : step } satisfies StepState })
  }

  const next = (e: FormEvent) => {
    e.preventDefault()
    const errs = stepErrors(form, current.id, today, knownKeys)
    if (Object.keys(errs).length) {
      setErrors(errs)
      requestAnimationFrame(() => errorBox.current?.focus())
      return
    }
    goTo(step + 1)
  }

  const save = async (status: ListingStatus) => {
    setSaveError(null)
    if (status !== 'draft') {
      const bad = allErrors(form, today, knownKeys).find((s) => Object.keys(s.errors).length)
      if (bad) {
        goTo(STEPS.indexOf(bad.step))
        setErrors(bad.errors)
        requestAnimationFrame(() => errorBox.current?.focus())
        return
      }
    } else if (form.title.trim().length < LISTING_LIMITS.titleMin) {
      setSaveError(`Give it a title (at least ${LISTING_LIMITS.titleMin} characters) on the first step before saving a draft.`)
      requestAnimationFrame(() => errorBox.current?.focus())
      return
    }
    setSaving(status)
    try {
      const draft = toDraft(form, status)
      const result = listing ? await api.updateListing(listing.id, draft) : await api.createListing(draft)
      setSaved(result)
      setDirty(false)
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Your listing wasn’t saved. Check your connection and try again.')
      requestAnimationFrame(() => errorBox.current?.focus())
    } finally {
      setSaving(null)
    }
  }

  const title = listing ? 'Edit your listing' : 'List an item'

  if (saved) return <Saved listing={saved} wasEdit={Boolean(listing)} headingRef={heading} />

  const errorList = Object.entries(errors).filter(([, v]) => v)
  // An edit keeps a paused listing paused; anything else is published.
  const publishStatus: ListingStatus = listing?.status === 'paused' ? 'paused' : 'active'
  const publishLabel = !listing || listing.status === 'draft' ? 'Publish listing' : 'Save changes'
  // With ID checks on, a live listing needs a checked ID; drafts and paused listings don't.
  const idBlocks = idNeeded && publishStatus === 'active'

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <Seo title={title} description="" noindex />
      <p className="font-semibold text-muted">{title}</p>
      <StepNav step={step} reached={reached} onGo={goTo} />

      <form noValidate onSubmit={next} className="mt-8">
        <h1 ref={heading} tabIndex={-1} className="text-4xl outline-none sm:text-5xl">
          {current.name}
        </h1>

        {(errorList.length > 0 || saveError) && (
          <div ref={errorBox} tabIndex={-1} role="alert" className="mt-6 rounded-[20px] border-2 border-danger bg-surface p-4 outline-none sm:p-5">
            <p className="flex items-center gap-2 font-semibold text-danger">
              <AlertCircle aria-hidden="true" className="size-5 shrink-0" />
              {saveError ?? (errorList.length === 1 ? 'One thing to fix before you go on:' : `${errorList.length} things to fix before you go on:`)}
            </p>
            {!saveError && (
              <ul className="mt-2 list-disc space-y-1 pl-7">
                {errorList.map(([k, v]) => (
                  <li key={k}>{v}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-8 space-y-7">
          {current.id === 'details' && <DetailsStep form={form} edit={edit} errors={errors} />}
          {current.id === 'photos' && (
            <>
              <p className="text-lg text-muted">Clear photos get more requests. Show the item itself, and anything that comes with it.</p>
              <PhotoUploader
                photos={form.photos}
                update={updatePhotos}
                error={errors.photos}
                onDiscard={(keys) => void api.discardListingPhotos(keys)}
              />
            </>
          )}
          {current.id === 'price' && <PriceStep form={form} edit={edit} errors={errors} />}
          {current.id === 'pickup' && <PickupStep form={form} edit={edit} errors={errors} today={today} booked={booked} />}
          {current.id === 'review' && <Review form={form} onChange={(id) => goTo(STEPS.findIndex((s) => s.id === id))} />}
          {current.id === 'review' && idBlocks && (
            <IdGate reason="list" note={!listing || listing.status === 'draft' ? 'You can save it as a draft meanwhile.' : undefined} className="mt-8" />
          )}
        </div>

        <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          {step > 0 && (
            <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={saving !== null}>
              Back
            </Button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">
            {(!listing || listing.status === 'draft') && (
              <Button variant="outline" onClick={() => void save('draft')} disabled={saving !== null}>
                {saving === 'draft' ? 'Saving…' : 'Save as draft'}
              </Button>
            )}
            {current.id === 'review' ? (
              <Button size="lg" onClick={() => void save(publishStatus)} disabled={saving !== null || idBlocks}>
                {saving && saving !== 'draft' ? 'Saving…' : publishLabel}
              </Button>
            ) : (
              <Button type="submit" size="lg" disabled={saving !== null}>
                Next: {STEPS[step + 1]!.name.toLowerCase()}
              </Button>
            )}
          </div>
        </div>
        {current.id === 'review' && (
          <p className="mt-4 text-[0.9375rem] text-muted">
            {publishStatus === 'paused'
              ? 'This listing is paused, so it stays hidden from renters after you save.'
              : 'Once it’s published, anyone can see it and send you a request. You can pause or edit it any time.'}{' '}
            By publishing you confirm it follows our <Link to="/terms" className="underline underline-offset-4">Terms</Link>.
          </p>
        )}
      </form>
    </div>
  )
}

/** The steps, in order. Steps you've already reached can be revisited. */
function StepNav({ step, reached, onGo }: { step: number; reached: number; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Steps" className="mt-3">
      <p className="mb-2 text-sm text-muted sm:sr-only">
        Step {step + 1} of {STEPS.length}
      </p>
      <ol className="flex gap-1.5" role="list">
        {STEPS.map((s, i) => {
          const done = i < step
          const here = i === step
          const canGo = i <= reached && !here
          const bar = <span aria-hidden="true" className={cx('block h-1.5 rounded-full', i <= step ? 'bg-ink' : 'bg-line-strong/50')} />
          const label = (
            <span className={cx('mt-2 hidden text-sm sm:block', here ? 'font-semibold' : 'text-muted')}>
              {s.name}
            </span>
          )
          return (
            <li key={s.id} className="min-w-0 flex-1">
              {canGo ? (
                <button type="button" onClick={() => onGo(i)} className="block w-full rounded py-1 text-left hover:[&>span:last-child]:text-text">
                  {bar}
                  {label}
                  <span className="sr-only">
                    {s.name}
                    {done ? ' (done)' : ''}
                  </span>
                </button>
              ) : (
                <span className="block py-1" aria-current={here ? 'step' : undefined}>
                  {bar}
                  {label}
                  <span className="sr-only">
                    {s.name}
                    {here ? ' (this step)' : ' (not reached yet)'}
                  </span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface StepProps {
  form: ListingForm
  edit: (patch: Partial<ListingForm>) => void
  errors: ListingErrors
}

function DetailsStep({ form, edit, errors }: StepProps) {
  return (
    <>
      <TextField
        label="Title"
        hint="What it is, the make and model. E.g. “Canon EOS 200D with 18–55mm lens”."
        value={form.title}
        maxLength={LISTING_LIMITS.titleMax}
        error={errors.title}
        onChange={(e) => edit({ title: e.target.value })}
      />
      <SelectField label="Category" value={form.categoryId} error={errors.categoryId} onChange={(e) => edit({ categoryId: e.target.value })}>
        <option value="" disabled>
          Choose a category
        </option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <fieldset aria-describedby={errors.condition ? 'condition-error' : undefined}>
        <legend className="mb-1.5 font-semibold">Condition</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {CONDITIONS.map((c) => (
            <Radio
              key={c.id}
              name="condition"
              value={c.id}
              checked={form.condition === c.id}
              onChange={() => edit({ condition: c.id })}
              label={
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-[0.9375rem] text-muted">{c.hint}</span>
                </span>
              }
              className="py-2"
            />
          ))}
        </div>
        {errors.condition && (
          <p id="condition-error" className="mt-1.5 text-[0.9375rem] font-medium text-danger">
            {errors.condition}
          </p>
        )}
      </fieldset>
      <TextAreaField
        label="Description"
        hint="What’s included, how old it is, and anything a renter should know."
        value={form.description}
        maxLength={LISTING_LIMITS.descriptionMax}
        error={errors.description}
        onChange={(e) => edit({ description: e.target.value })}
      />
      <SelectField
        label="Where renters collect it"
        hint="Only the area is shown. You share the exact address with a renter once you accept their request."
        value={form.areaId}
        error={errors.areaId}
        onChange={(e) => edit({ areaId: e.target.value })}
      >
        <option value="" disabled>
          Choose an area in {LAUNCH_CITY}
        </option>
        {AREAS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>
    </>
  )
}

const numberProps = { inputMode: 'numeric' as const, autoComplete: 'off', pattern: '[0-9]*' }

function PriceStep({ form, edit, errors }: StepProps) {
  const cat = getCategory(form.categoryId)
  const n = (v: string) => (/^\d+$/.test(v) ? Number(v) : undefined)
  const daily = form.byDay ? n(form.daily) : undefined
  const weekly = form.byDay ? n(form.weekly) : undefined
  const monthly = n(form.monthly)
  const value = n(form.itemValue)
  const examples = daily
    ? [3, ...(weekly ? [7] : [])].map((days) => {
        try {
          return { label: plural(days, 'day'), rent: bestRent(days, { daily, weekly, monthly: form.byMonth ? undefined : monthly }) }
        } catch {
          return null
        }
      })
    : []
  if (form.byMonth && monthly) examples.push({ label: '1 month', rent: monthly }, ...(n(form.maxMonths) && n(form.maxMonths)! > 1 ? [{ label: plural(n(form.maxMonths)!, 'month'), rent: monthly * n(form.maxMonths)! }] : []))
  const monthOptions = Array.from({ length: LISTING_LIMITS.maxMonthsCap }, (_, i) => i + 1)

  return (
    <>
      <fieldset aria-describedby={errors.term ? 'term-error' : undefined}>
        <legend className="mb-1.5 font-semibold">How can people rent it?</legend>
        <Checkbox
          label="By the day"
          description="For a weekend, an event or a trip. You set a price per day, and per week if you like."
          checked={form.byDay}
          onChange={(e) => edit({ byDay: e.target.checked })}
        />
        <Checkbox
          label="By the month"
          description="For furniture, appliances and anything people need for a while. Rent is paid month by month, up to 12 months."
          checked={form.byMonth}
          onChange={(e) => edit({ byMonth: e.target.checked })}
        />
        {errors.term && (
          <p id="term-error" className="mt-1 text-[0.9375rem] font-medium text-danger">
            {errors.term}
          </p>
        )}
      </fieldset>

      {form.byDay && (
        <section aria-labelledby="by-day-title" className="space-y-5 rounded-[20px] border border-line p-4 sm:p-5">
          <h2 id="by-day-title" className="font-sans text-lg font-semibold">
            By the day
          </h2>
          <TextField
            label="Price per day"
            prefix="₹"
            {...numberProps}
            value={form.daily}
            error={errors.pricing}
            hint={cat ? `Things in ${cat.name} often go for about ${rupees(cat.avgDailyRate)} a day. That’s our rough estimate, not a rule.` : undefined}
            onChange={(e) => edit({ daily: e.target.value })}
          />
          <TextField
            label="Price per week (optional)"
            prefix="₹"
            {...numberProps}
            value={form.weekly}
            error={errors.weekly}
            hint={daily ? `Less than ${rupees(daily * 7)} (7 days at your daily price).` : 'A discount for longer rentals.'}
            onChange={(e) => edit({ weekly: e.target.value })}
          />
          {!form.byMonth && form.monthly && (
            <TextField
              label="Price per 30 days (optional)"
              prefix="₹"
              {...numberProps}
              value={form.monthly}
              error={errors.monthly}
              hint="A discount for long daily rentals. To offer proper monthly rentals, tick “By the month” above."
              onChange={(e) => edit({ monthly: e.target.value })}
            />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Shortest rental, in days" {...numberProps} value={form.minDays} error={errors.minDays} onChange={(e) => edit({ minDays: e.target.value })} />
            <TextField
              label="Longest rental, in days"
              {...numberProps}
              value={form.maxDays}
              error={errors.maxDays}
              hint={`Up to ${LISTING_LIMITS.maxDaysCap}.${form.byMonth ? ' Longer than that is by the month.' : ''}`}
              onChange={(e) => edit({ maxDays: e.target.value })}
            />
          </div>
        </section>
      )}

      {form.byMonth && (
        <section aria-labelledby="by-month-title" className="space-y-5 rounded-[20px] border border-line p-4 sm:p-5">
          <h2 id="by-month-title" className="font-sans text-lg font-semibold">
            By the month
          </h2>
          <TextField
            label="Price per month"
            prefix="₹"
            {...numberProps}
            value={form.monthly}
            error={errors.monthly}
            hint={daily ? `Less than ${rupees(daily * 30)} (30 days at your daily price).` : 'Paid at the start of each month, directly to you.'}
            onChange={(e) => edit({ monthly: e.target.value })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Shortest rental" value={form.minMonths} error={errors.months} onChange={(e) => edit({ minMonths: e.target.value })}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {plural(m, 'month')}
                </option>
              ))}
            </SelectField>
            <SelectField label="Longest rental" value={form.maxMonths} onChange={(e) => edit({ maxMonths: e.target.value })}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {plural(m, 'month')}
                </option>
              ))}
            </SelectField>
          </div>
          <p className="text-[0.9375rem] text-muted">
            The renter pays the first month and the deposit at pickup, then each month’s rent at its start. Either of you can end it early with a month’s notice.
          </p>
        </section>
      )}

      {examples.some(Boolean) && (
        <div className="card rounded-[20px] p-4 sm:p-5">
          <p className="font-semibold">What a renter would pay in rent</p>
          <ul className="mt-2 space-y-1">
            {examples.filter(Boolean).map((x) => (
              <li key={x!.label} className="flex justify-between gap-4">
                <span>{x!.label}</span>
                <span className="font-semibold">{rupees(x!.rent)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.9375rem] text-muted">
            {FEES.ownerCommissionPct === 0
              ? 'You keep all of it. RentiGoo doesn’t take a cut while payments happen in person.'
              : `RentiGoo keeps ${FEES.ownerCommissionPct}% of the rent.`}
          </p>
        </div>
      )}

      <TextField
        label="What it cost new"
        prefix="₹"
        {...numberProps}
        value={form.itemValue}
        error={errors.itemValue}
        hint={`Roughly what you paid, or what it costs new today. It sets the most you can ask as a deposit: ${POLICY.depositPctOfValue}% of this.`}
        onChange={(e) => edit({ itemValue: e.target.value })}
      />
      {needsReceipt(value) && (
        <ReceiptField receipt={form.receipt} hasReceipt={form.hasReceipt} error={errors.receipt} onChange={(receipt) => edit({ receipt })} />
      )}

      <TextField
        label="Refundable deposit"
        prefix="₹"
        {...numberProps}
        value={form.deposit}
        error={errors.deposit}
        hint={`The renter pays it at pickup. Give it all back within ${POLICY.depositReturnHours} hours of the return unless you report damage with photos. ${
          value ? `Up to ${rupees(depositCap(form.categoryId, value))}` : `Up to ${POLICY.depositPctOfValue}% of what it cost new`
        }, within the limit for this kind of item; ₹0 for none.`}
        onChange={(e) => edit({ deposit: e.target.value })}
      />
    </>
  )
}

function PickupStep({ form, edit, errors, today, booked }: StepProps & { today: string; booked: string[] }) {
  return (
    <>
      <fieldset>
        <legend className="mb-1.5 font-semibold">How renters get it</legend>
        <Checkbox
          label="They collect it from me"
          description={`In ${areaName(form.areaId)}. You share the address after accepting a request.`}
          checked={form.pickup}
          onChange={(e) => edit({ pickup: e.target.checked })}
        />
        <Checkbox label="I can deliver it" description="Within Bhopal, for a fee you set." checked={form.delivery} onChange={(e) => edit({ delivery: e.target.checked })} />
        {errors.pickupOptions && <p className="mt-1 text-[0.9375rem] font-medium text-danger">{errors.pickupOptions}</p>}
      </fieldset>
      {form.delivery && (
        <TextField
          label="Delivery fee (both ways)"
          prefix="₹"
          {...numberProps}
          value={form.deliveryFee}
          error={errors.deliveryFee}
          hint="₹0 for free delivery."
          onChange={(e) => edit({ deliveryFee: e.target.value })}
        />
      )}

      <Rules rules={form.rules} onChange={(rules) => edit({ rules })} error={errors.rules} />

      <section aria-labelledby="block-title">
        <h2 id="block-title" className="font-sans text-lg font-semibold">
          Days it’s not available (optional)
        </h2>
        <p className="mt-1 text-muted">Tap days you need it yourself. Renters can’t ask for those days. You can change this any time.</p>
        <div className="mt-3">
          <BlockDates today={today} value={form.blockedDates} booked={booked} onChange={(blockedDates) => edit({ blockedDates })} />
        </div>
        {errors.blockedDates && <p className="mt-1 text-[0.9375rem] font-medium text-danger">{errors.blockedDates}</p>}
      </section>
    </>
  )
}

function Rules({ rules, onChange, error }: { rules: string[]; onChange: (r: string[]) => void; error?: string }) {
  const list = useRef<HTMLUListElement>(null)
  const focusInput = (i: number) => requestAnimationFrame(() => list.current?.querySelectorAll('input')[i]?.focus())
  return (
    <section aria-labelledby="rules-title">
      <h2 id="rules-title" className="font-sans text-lg font-semibold">
        Your rules (optional)
      </h2>
      <p className="mt-1 text-muted">Short and clear, e.g. “No use in the rain” or “Return it charged”.</p>
      {rules.length > 0 && (
        <ul ref={list} className="mt-3 space-y-3">
          {rules.map((r, i) => (
            <li key={i} className="flex items-end gap-2">
              <TextField
                className="flex-1"
                label={`Rule ${i + 1}`}
                hideLabel
                value={r}
                maxLength={LISTING_LIMITS.ruleMax}
                onChange={(e) => onChange(rules.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <Button
                variant="ghost"
                className="size-12 shrink-0 px-0"
                aria-label={`Remove rule ${i + 1}`}
                onClick={() => {
                  onChange(rules.filter((_, j) => j !== i))
                  focusInput(Math.max(0, i - 1))
                }}
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-[0.9375rem] font-medium text-danger">{error}</p>}
      {rules.length < LISTING_LIMITS.rulesMax && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          icon={<Plus aria-hidden="true" className="size-4" />}
          onClick={() => {
            onChange([...rules, ''])
            focusInput(rules.length)
          }}
        >
          Add a rule
        </Button>
      )}
    </section>
  )
}

function Review({ form, onChange }: { form: ListingForm; onChange: (step: StepId) => void }) {
  const d = toDraft(form, 'active')
  const cover = d.photos[0]
  const prices = [
    ...(d.pricing.daily !== undefined ? [`${rupees(d.pricing.daily)} a day`] : []),
    ...(d.pricing.weekly ? [`${rupees(d.pricing.weekly)} a week`] : []),
    ...(d.pricing.monthly ? [`${rupees(d.pricing.monthly)} a month`] : []),
  ]
  const upcomingBlocked = form.blockedDates.length
  return (
    <div className="space-y-6">
      <p className="text-lg text-muted">Here’s what renters will see. Check it over, then publish.</p>
      <div className="overflow-hidden rounded-[24px] border border-line bg-surface">
        {cover && (
          <div className="aspect-[16/9] bg-sunken">
            <ListingImage photo={cover} />
          </div>
        )}
        <div className="p-5">
          <p className="text-muted">
            {categoryName(d.categoryId)}, {CONDITIONS.find((c) => c.id === d.condition)?.name.toLowerCase()}, in {areaName(d.areaId)}
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl">{d.title}</h2>
          <p className="mt-3 whitespace-pre-line">{d.description}</p>
        </div>
      </div>
      <dl className="divide-y divide-line rounded-[24px] border border-line bg-surface">
        <ReviewRow term="Photos" step="photos" onChange={onChange}>
          {plural(d.photos.length, 'photo')}, each with a description
        </ReviewRow>
        <ReviewRow term="Price" step="price" onChange={onChange}>
          {prices.join(', ')}
        </ReviewRow>
        <ReviewRow term="Deposit" step="price" onChange={onChange}>
          {d.deposit ? `${rupees(d.deposit)}, refundable` : 'No deposit'}
        </ReviewRow>
        <ReviewRow term="Rental length" step="price" onChange={onChange}>
          {[
            d.pricing.daily !== undefined && (d.minDays === d.maxDays ? `${plural(d.minDays, 'day')}` : `${plural(d.minDays, 'day')} to ${plural(d.maxDays, 'day')}`),
            d.months && (d.months.min === d.months.max ? plural(d.months.min, 'month') : `${plural(d.months.min, 'month')} to ${plural(d.months.max, 'month')}`),
          ]
            .filter(Boolean)
            .join(', or ')}
        </ReviewRow>
        <ReviewRow term="Pickup" step="pickup" onChange={onChange}>
          {[d.pickupOptions.includes('pickup') && `Collect from ${areaName(d.areaId)}`, d.pickupOptions.includes('delivery') && `Delivery for ${d.deliveryFee ? rupees(d.deliveryFee) : 'free'}`]
            .filter(Boolean)
            .join('; ')}
        </ReviewRow>
        <ReviewRow term="Rules" step="pickup" onChange={onChange}>
          {d.rules.length ? d.rules.join('; ') : 'None'}
        </ReviewRow>
        <ReviewRow term="Blocked days" step="pickup" onChange={onChange}>
          {upcomingBlocked ? plural(upcomingBlocked, 'day') : 'None'}
        </ReviewRow>
      </dl>
    </div>
  )
}

function ReviewRow({ term, step, onChange, children }: { term: string; step: StepId; onChange: (s: StepId) => void; children: ReactNode }) {
  return (
    <div className="px-5 py-3.5 sm:flex sm:gap-4">
      <dt className="pt-2.5 font-semibold sm:w-36 sm:shrink-0">{term}</dt>
      <dd className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <span className="pt-2.5 text-muted sm:text-text">{children}</span>
        <button type="button" onClick={() => onChange(step)} className="min-h-11 shrink-0 rounded px-1 font-semibold underline underline-offset-4">
          Change<span className="sr-only"> {term.toLowerCase()}</span>
        </button>
      </dd>
    </div>
  )
}

function Saved({ listing, wasEdit, headingRef }: { listing: Listing; wasEdit: boolean; headingRef: React.Ref<HTMLHeadingElement> }) {
  const navigate = useNavigate()
  const live = listing.status === 'active'
  const heading = listing.status === 'draft' ? 'Draft saved' : wasEdit ? 'Changes saved' : 'Your listing is live'
  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6 md:py-20">
      <Seo title={heading} description="" noindex />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-on-accent"
      >
        <Check aria-hidden="true" className="size-8" strokeWidth={2.5} />
      </motion.div>
      <h1 ref={headingRef} tabIndex={-1} className="mt-5 text-4xl outline-none sm:text-5xl">
        {heading}
      </h1>
      <p className="mt-3 text-lg text-muted">
        {listing.status === 'draft'
          ? 'Only you can see it. Come back to finish it whenever you like.'
          : live
            ? 'Renters can find it now. When someone sends a request, you’ll see it in your dashboard and choose whether to accept.'
            : 'It’s paused, so renters can’t see it until you switch it back on.'}
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {listing.status === 'draft' ? (
          <ButtonLink to={`/list?edit=${listing.id}`}>Keep editing</ButtonLink>
        ) : (
          <ButtonLink to={`/listing/${listing.id}`}>See your listing</ButtonLink>
        )}
        <Button variant="outline" onClick={() => navigate(wasEdit ? '/dashboard' : '/list')}>
          {wasEdit ? 'Go to your dashboard' : 'List another item'}
        </Button>
      </div>
    </div>
  )
}
