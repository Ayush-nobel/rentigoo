import { motion } from 'framer-motion'
import { BadgeCheck, Phone } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { maskPhone, OTP, phoneProblem } from '@shared/phone'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { useAsync } from '@/hooks/useAsync'
import { api, ApiError, DATA_MODE } from '@/lib'

type Step = 'number' | 'code'

/**
 * Optional "Phone number checked" badge. The number is used once, to text a
 * code; RentiGoo keeps only a fingerprint so one number can't verify many accounts.
 */
export function PhoneCheck() {
  const status = useAsync(() => api.getPhoneStatus(), [])
  const [verified, setVerified] = useState<boolean | null>(null)
  const [step, setStep] = useState<Step>('number')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const isVerified = verified ?? status.data?.verified ?? false
  const fail = (e: unknown, fallback: string) => setError(e instanceof ApiError ? e.message : fallback)

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const problem = phoneProblem(phone)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      const r = await api.startPhoneCheck(phone)
      setSentTo(r.sentTo)
      setWait(r.resendInSeconds)
      setStep('code')
      setCode('')
      requestAnimationFrame(() => codeRef.current?.focus())
    } catch (err) {
      fail(err, 'We couldn’t send a code. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    if (code.replace(/\D/g, '').length !== OTP.length) return setError(`Enter the ${OTP.length}-digit code from the text message.`)
    setBusy(true)
    setError(null)
    try {
      const r = await api.confirmPhoneCheck(code)
      setVerified(r.verified)
      setStep('number')
      setPhone('')
      requestAnimationFrame(() => doneRef.current?.focus())
    } catch (err) {
      fail(err, 'That didn’t go through. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.forgetPhone()
      setVerified(r.verified)
      setConfirmRemove(false)
    } catch (err) {
      fail(err, 'That didn’t go through. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="phone-title" className="rounded-[24px] border border-line bg-surface p-5 sm:p-6">
      <h2 id="phone-title" className="flex items-center gap-2 text-2xl">
        <Phone aria-hidden="true" className="size-6" /> Phone number
      </h2>

      {status.status === 'loading' && verified === null ? (
        <p className="mt-3 text-muted">Checking…</p>
      ) : !status.data?.available && !isVerified ? (
        <p className="mt-3 text-muted">
          Phone checks aren’t switched on yet. When they are, you’ll be able to add a “Phone number checked” badge to your profile and listings.
        </p>
      ) : isVerified ? (
        <div className="mt-3">
          <motion.p
            ref={doneRef}
            tabIndex={-1}
            initial={verified ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 font-semibold text-success outline-none"
          >
            <BadgeCheck aria-hidden="true" className="size-5" /> Your phone number is checked.
          </motion.p>
          <p className="mt-2 text-muted">
            Others see a “Phone number checked” badge on your profile. We didn’t keep the number itself, only a fingerprint of it, so it can’t be used to check
            another account.
          </p>
          {confirmRemove ? (
            <div className="mt-4 rounded-xl border border-danger/50 p-4">
              <p className="font-semibold">Remove the check? The badge goes, and you can check a number again any time.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" size="sm" onClick={() => void remove()} disabled={busy}>
                  {busy ? 'Removing…' : 'Yes, remove it'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)} disabled={busy}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setConfirmRemove(true)}>
              Remove phone check
            </Button>
          )}
        </div>
      ) : step === 'number' ? (
        <form noValidate onSubmit={send} className="mt-3">
          <p className="text-muted">
            Optional. Check your mobile number with a one-time code and get a “Phone number checked” badge. We don’t keep the number, and it’s never shown to
            anyone.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
            <TextField
              className="sm:flex-1"
              label="Mobile number"
              prefix="+91"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phone}
              error={error ?? undefined}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" className="sm:mt-7.5" disabled={busy}>
              {busy ? 'Sending…' : 'Text me a code'}
            </Button>
          </div>
          {DATA_MODE === 'mock' && <p className="mt-2 text-[0.9375rem] text-muted">Test version: no text is sent. The code is 246810.</p>}
        </form>
      ) : (
        <form noValidate onSubmit={confirm} className="mt-3">
          <p role="status">We’ve sent a {OTP.length}-digit code to {maskPhone(sentTo)}. It works for {OTP.validMinutes} minutes.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
            <TextField
              ref={codeRef}
              className="sm:max-w-48"
              label="Code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP.length}
              value={code}
              error={error ?? undefined}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <Button type="submit" className="sm:mt-7.5" disabled={busy}>
              {busy ? 'Checking…' : 'Check code'}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <button type="button" disabled={wait > 0 || busy} onClick={() => void send()} className="min-h-11 rounded font-semibold underline underline-offset-4 disabled:text-muted disabled:no-underline">
              {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('number')
                setError(null)
              }}
              className="min-h-11 rounded font-semibold underline underline-offset-4"
            >
              Use a different number
            </button>
          </div>
          {DATA_MODE === 'mock' && <p className="mt-2 text-[0.9375rem] text-muted">Test version: the code is 246810.</p>}
        </form>
      )}
    </section>
  )
}
