import { BadgeCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AuthFrame } from '@/components/auth/AuthFields'
import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { api, ApiError } from '@/lib'

/** Where the payment page sends the renter back: checks the payment and says how it went. */
export default function BookingFeeReturn() {
  const [params] = useSearchParams()
  const bookingId = params.get('booking') ?? ''
  const [result, setResult] = useState<{ done: boolean; error?: string }>({ done: false })
  const started = useRef(false)
  const missing = !bookingId
  const state = missing ? { done: true, error: 'We couldn’t tell which booking this payment was for. Check your dashboard.' } : result

  useEffect(() => {
    if (missing || started.current) return
    started.current = true
    api.confirmBookingFee(bookingId, Object.fromEntries(params)).then(
      () => setResult({ done: true }),
      (e: unknown) => setResult({ done: true, error: e instanceof ApiError ? e.message : 'We couldn’t confirm the payment. Check your dashboard, or WhatsApp us.' }),
    )
  }, [missing, bookingId, params])

  return (
    <>
      <Seo title="Booking fee" description="" noindex />
      <AuthFrame title={!state.done ? 'Checking your payment' : state.error ? 'Payment not confirmed' : 'Booking fee paid'}>
        <div role="status">
          {!state.done ? (
            <p className="text-lg text-muted">Just a moment…</p>
          ) : state.error ? (
            <p className="text-lg">{state.error}</p>
          ) : (
            <p className="flex items-center gap-2 text-lg font-semibold text-success">
              <BadgeCheck aria-hidden="true" className="size-6" /> Your dates are locked in. Pay the owner the rent and deposit at pickup.
            </p>
          )}
        </div>
        {state.done && (
          <ButtonLink to="/dashboard?tab=rentals" className="mt-6">
            Go to your rentals
          </ButtonLink>
        )}
      </AuthFrame>
    </>
  )
}
