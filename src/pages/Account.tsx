import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { areaName } from '@shared/areas'
import { LEGAL } from '@shared/legal'
import { Seo } from '@/components/layout/Seo'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { api, ApiError, auth } from '@/lib'
import { collectMyData, downloadJSON } from '@/lib/exportData'
import { longDate } from '@/lib/format'

export default function Account() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const email = useAsync(() => auth.currentEmail(), [user?.id])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!user) return null

  const download = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const data = await collectMyData(api, user.id, email.data ?? null)
      downloadJSON(data, `rentigoo-my-data-${new Date().toISOString().slice(0, 10)}.json`)
    } catch {
      setExportError('We couldn’t put your data together just now. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const remove = async () => {
    if (!confirm) {
      setDeleteError('Tick the box above to confirm first.')
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      const s = await api.deleteMyAccount()
      // Home signs out once it's showing; signing out here would trip this
      // protected page's redirect to /login while Home is still loading.
      navigate('/', { replace: true, state: { deleted: s } })
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : 'Your account wasn’t deleted. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:px-6 md:py-14">
      <Seo title="Your account" description="" noindex />
      <header>
        <h1 className="text-4xl sm:text-5xl">Your account</h1>
        <p className="mt-2 text-lg text-muted">Your details, and control over the data we hold about you.</p>
      </header>

      <section aria-labelledby="details-title" className="rounded-[24px] border border-line bg-surface p-5 sm:p-6">
        <h2 id="details-title" className="text-2xl">
          Your details
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Detail term="Name" value={user.name} note="Others see only your first name and last initial." />
          <Detail term="Email" value={email.data ?? '…'} note="Never shown to other people." />
          <Detail term="Area" value={areaName(user.areaId)} />
          <Detail
            term="You agreed to"
            value={user.consent ? `Terms and Privacy Policy, on ${longDate(user.consent.at.slice(0, 10))}` : 'No record (demo account)'}
            note={
              user.consent && (user.consent.termsVersion !== LEGAL.terms.version || user.consent.privacyVersion !== LEGAL.privacy.version)
                ? 'Our documents have changed since. We’ll ask you to review them.'
                : undefined
            }
          />
        </dl>
      </section>

      <section aria-labelledby="data-title">
        <h2 id="data-title" className="text-3xl">
          Your data
        </h2>
        <p className="mt-2 max-w-[65ch] text-muted">
          You can take a copy of your data or delete your account whenever you like. Read the{' '}
          <Link to={LEGAL.privacy.path} className="font-semibold text-accent-text underline underline-offset-4">
            Privacy Policy
          </Link>{' '}
          for what we keep and why.
        </p>

        <div className="mt-6 rounded-[24px] border border-line bg-surface p-5 sm:p-6">
          <h3 className="font-sans text-xl font-semibold">Download my data</h3>
          <p className="mt-1 text-muted">Your profile, listings, bookings, reviews and messages, as one file.</p>
          <Button variant="outline" className="mt-4" onClick={download} disabled={exporting} icon={<Download aria-hidden="true" className="size-5" />}>
            {exporting ? 'Preparing your file…' : 'Download my data'}
          </Button>
          {exportError && (
            <p role="alert" className="mt-3 font-medium text-danger">
              {exportError}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-[24px] border border-danger/40 bg-surface p-5 sm:p-6">
          <h3 className="font-sans text-xl font-semibold">Delete my account</h3>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-semibold">Deleted straight away</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted marker:text-muted">
                <li>Your profile and login</li>
                <li>Your listings</li>
                <li>Reviews you wrote, and reviews about you</li>
                <li>The words of messages you sent</li>
                <li>Open requests and upcoming bookings (cancelled)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Kept, because the law requires it</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted marker:text-muted">
                <li>A minimal record of past bookings: dates, item, amounts, and an ID (no name, no messages)</li>
              </ul>
              <p className="mt-2 text-[0.9375rem] text-muted">We keep these only as long as tax and consumer laws require, then delete them.</p>
            </div>
          </div>
          <p className="mt-4">If you have an item out with someone right now, finish that rental first.</p>
          <Checkbox
            className="mt-3"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            label="I understand this can’t be undone."
          />
          <Button variant="danger" className="mt-3" onClick={remove} disabled={deleting} icon={<Trash2 aria-hidden="true" className="size-5" />}>
            {deleting ? 'Deleting your account…' : 'Delete my account'}
          </Button>
          {deleteError && (
            <p role="alert" className="mt-3 font-medium text-danger">
              {deleteError}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function Detail({ term, value, note }: { term: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[0.9375rem] text-muted">{term}</dt>
      <dd className="mt-0.5 font-semibold break-words">{value}</dd>
      {note && <dd className="mt-0.5 text-[0.9375rem] text-muted">{note}</dd>}
    </div>
  )
}
