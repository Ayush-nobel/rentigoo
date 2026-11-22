import { BadgeCheck, IdCard } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAsync } from '@/hooks/useAsync'
import { api, ApiError, DATA_MODE } from '@/lib'

/**
 * Optional "ID checked" badge through DigiLocker. Shows nothing at all until ID
 * checks are switched on, so the site never offers a check we don't do.
 */
export function IdCheck() {
  const status = useAsync(() => api.getIdStatus(), [])
  const [verified, setVerified] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!status.data?.available) return null
  const isVerified = verified ?? status.data.verified

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const { url } = await api.startIdCheck(`${window.location.origin}/account/id-check`)
      window.location.href = url
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The ID check didn’t start. Please try again.')
      setBusy(false)
    }
  }
  const remove = async () => {
    setBusy(true)
    try {
      setVerified((await api.forgetIdCheck()).verified)
      setConfirmRemove(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That didn’t go through. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="id-title" className="rounded-[24px] border border-line bg-surface p-5 sm:p-6">
      <h2 id="id-title" className="flex items-center gap-2 text-2xl">
        <IdCard aria-hidden="true" className="size-6" /> ID check
      </h2>
      {isVerified ? (
        <div className="mt-3">
          <p className="flex items-center gap-2 font-semibold text-success">
            <BadgeCheck aria-hidden="true" className="size-5" /> Your ID is checked.
          </p>
          <p className="mt-2 text-muted">Others see an “ID checked” badge on your profile. We kept only that it was checked and when, not your ID details.</p>
          {confirmRemove ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="danger" size="sm" onClick={() => void remove()} disabled={busy}>
                {busy ? 'Removing…' : 'Yes, remove it'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)} disabled={busy}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setConfirmRemove(true)}>
              Remove ID check
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-muted">
            Needed before you publish a listing or send a rental request. Share your Aadhaar from DigiLocker, the government’s document app, and get an “ID
            checked” badge. We check the name matches your profile, then keep only that it was checked. Never your Aadhaar number, date of birth, address or photo.
          </p>
          <Button className="mt-4" onClick={() => void start()} disabled={busy}>
            {busy ? 'Opening DigiLocker…' : 'Check my ID with DigiLocker'}
          </Button>
          {DATA_MODE === 'mock' && <p className="mt-2 text-[0.9375rem] text-muted">Test version: no real ID check happens.</p>}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 font-medium text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
