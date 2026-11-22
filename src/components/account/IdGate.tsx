import { IdCard } from 'lucide-react'
import { useState } from 'react'
import { ID_NEEDED } from '@shared/idCheck'
import { Button } from '@/components/ui/Button'
import { api, ApiError, DATA_MODE } from '@/lib'
import { ID_NEXT_KEY } from '@/hooks/useIdNeeded'

/** The "check your ID first" step, shown before publishing a listing or sending a rental request. */
export function IdGate({ reason, note, className = '', framed = true }: { reason: 'list' | 'rent'; note?: string; className?: string; framed?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      // Come back to this page (with its dates or the saved draft) once the check is done.
      try {
        sessionStorage.setItem(ID_NEXT_KEY, window.location.pathname + window.location.search)
      } catch {}
      const { url } = await api.startIdCheck(`${window.location.origin}/account/id-check`)
      window.location.href = url
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The ID check didn’t start. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className={`${framed ? 'card rounded-[20px] p-4 sm:p-5' : ''} ${className}`}>
      <p className="flex items-center gap-2 text-lg font-semibold">
        <IdCard aria-hidden="true" className="size-5 shrink-0" /> Check your ID first
      </p>
      <p className="mt-1 text-muted">
        {ID_NEEDED[reason]}
        {note ? ` ${note}` : ''}
      </p>
      <p className="mt-2 text-[0.9375rem] text-muted">
        You share your Aadhaar from DigiLocker, the government’s document app. We check the name matches your profile and keep only that it was checked. Never your
        Aadhaar number, date of birth, address or photo.
      </p>
      <Button className="mt-4" onClick={() => void start()} disabled={busy}>
        {busy ? 'Opening DigiLocker…' : 'Check my ID with DigiLocker'}
      </Button>
      {DATA_MODE === 'mock' && <p className="mt-2 text-[0.9375rem] text-muted">Test version: no real ID check happens.</p>}
      {error && (
        <p role="alert" className="mt-3 font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
