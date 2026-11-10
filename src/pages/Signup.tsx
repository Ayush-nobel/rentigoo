import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { emailProblem, nameProblem, passwordProblem, areaProblem } from '@shared/accountRules'
import { AREAS, LAUNCH_CITY } from '@shared/areas'
import { LEGAL, MIN_AGE } from '@shared/legal'
import { AuthFrame, CodeField, FormError, PasswordField } from '@/components/auth/AuthFields'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { SelectField, TextField } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { useTitle } from '@/hooks/useAsync'
import { api, ApiError, auth, AuthError, DATA_MODE, safeNext } from '@/lib'

type Step = 'details' | 'confirm' | 'profile'
interface Pending {
  name: string
  areaId: string
  email: string
  /** Both consent boxes were ticked on the details step. */
  agreed: boolean
}

// Name and area wait here between "sign up" and "email confirmed".
const PENDING = 'rentigoo-signup'
function readPending(): Pending | null {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING) ?? 'null') as Pending | null
  } catch {
    return null
  }
}
function writePending(p: Pending | null) {
  try {
    if (p) sessionStorage.setItem(PENDING, JSON.stringify(p))
    else sessionStorage.removeItem(PENDING)
  } catch {
    /* private mode: the profile step will ask again */
  }
}

export default function Signup() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { status, refresh } = useAuth()
  const next = safeNext(params.get('next'))
  const step = (['details', 'confirm', 'profile'].includes(params.get('step') ?? '') ? params.get('step') : 'details') as Step
  const pending = readPending()

  const [name, setName] = useState(pending?.name ?? '')
  const [email, setEmail] = useState(params.get('email') ?? pending?.email ?? '')
  const [areaId, setAreaId] = useState(pending?.areaId ?? '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)

  useTitle(step === 'confirm' ? 'Check your email' : step === 'profile' ? 'Finish your profile' : 'Create your account')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (status === 'signed-in') return <Navigate to={next} replace />
  if (step === 'profile' && status === 'signed-out') return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />

  const go = (s: Step, extra: Record<string, string> = {}) => setParams({ step: s, next, ...extra }, { replace: s !== 'confirm' })

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof AuthError || e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const consentErrors = () => {
    const errs: Record<string, string> = {}
    if (!agreeTerms) errs.terms = `Please confirm you’re ${MIN_AGE} or older and agree to the Terms.`
    if (!agreePrivacy) errs.privacy = 'We need your agreement to use your details, or we can’t run your account.'
    return errs
  }

  const finishProfile = async (p: { name: string; areaId: string }) => {
    // Pick up the session that sign-in just created before writing as this person.
    if ((await refresh()) === 'signed-out') {
      navigate(`/login?notice=confirmed&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`, { replace: true })
      return
    }
    await api.createMyProfile({ ...p, termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })
    writePending(null)
    await refresh()
    navigate(next, { replace: true })
  }

  const submitDetails = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const checks: [string, string | null][] = [
      ['name', nameProblem(name)],
      ['email', emailProblem(email)],
      ['areaId', areaProblem(areaId)],
      ['password', passwordProblem(password)],
    ]
    for (const [k, v] of checks) if (v) errs[k] = v
    Object.assign(errs, consentErrors())
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    void run(async () => {
      writePending({ name, areaId, email: email.trim(), agreed: agreeTerms && agreePrivacy })
      const result = await auth.signUp(email, password)
      if (result === 'done') {
        await auth.signIn(email, password)
        await finishProfile({ name, areaId })
        return
      }
      // (consent is checked above, before sign-up starts)
      setCooldown(30)
      go('confirm', { email: email.trim() })
    })
  }

  const submitCode = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({ code: 'Enter the 6-digit code from the email.' })
      return
    }
    setFieldErrors({})
    void run(async () => {
      const result = await auth.confirmEmail(email, code)
      if (result === 'sign-in') {
        navigate(`/login?notice=confirmed&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`, { replace: true })
        return
      }
      // Only create the profile here if consent was given; otherwise ask on the profile step.
      const p = readPending()
      if (p?.agreed) await finishProfile(p)
      else {
        await refresh()
        go('profile')
      }
    })
  }

  const resend = () =>
    void run(async () => {
      await auth.resendCode(email)
      setCooldown(30)
      setNotice(`We’ve sent a new code to ${email}.`)
    })

  const submitProfile = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const np = nameProblem(name)
    const ap = areaProblem(areaId)
    if (np) errs.name = np
    if (ap) errs.areaId = ap
    Object.assign(errs, consentErrors())
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    void run(() => finishProfile({ name, areaId }))
  }

  const areaSelect = (
    <SelectField label={`Your area in ${LAUNCH_CITY}`} value={areaId} onChange={(e) => setAreaId(e.target.value)} error={fieldErrors.areaId} hint="So we can show you things nearby first.">
      <option value="">Choose your area</option>
      {AREAS.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </SelectField>
  )
  const consentBlock = (
    <fieldset className="space-y-1">
      <legend className="mb-1 font-semibold">Before you join</legend>
      <Checkbox
        checked={agreeTerms}
        onChange={(e) => setAgreeTerms(e.target.checked)}
        error={fieldErrors.terms}
        required
        label={
          <>
            I’m {MIN_AGE} or older and I agree to the{' '}
            <Link to={LEGAL.terms.path} target="_blank" className="font-semibold underline underline-offset-4">
              Terms and Conditions
            </Link>
            .
          </>
        }
      />
      <Checkbox
        checked={agreePrivacy}
        onChange={(e) => setAgreePrivacy(e.target.checked)}
        error={fieldErrors.privacy}
        required
        label={
          <>
            I agree to RentiGoo using my details as explained in the{' '}
            <Link to={LEGAL.privacy.path} target="_blank" className="font-semibold underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </>
        }
        description="Only what’s needed to run your account. You can download or delete your data any time from Account."
      />
    </fieldset>
  )
  const nameField = <TextField label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} hint="Owners and renters will see your first name." />

  if (step === 'confirm') {
    return (
      <AuthFrame title="Check your email" intro={<>We’ve sent a 6-digit code to <strong className="text-text">{email || 'your email'}</strong>. It can take a minute to arrive, and it sometimes lands in spam.</>}>
        <form onSubmit={submitCode} noValidate className="space-y-5">
          {notice && (
            <p role="status" className="rounded-field bg-sunken p-3 font-medium">
              {notice}
            </p>
          )}
          <FormError>{error}</FormError>
          <CodeField value={code} onChange={setCode} error={fieldErrors.code} />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? 'Checking…' : 'Confirm email'}
            </Button>
            <button type="button" onClick={resend} disabled={busy || cooldown > 0} className="min-h-11 rounded font-semibold underline underline-offset-4 disabled:no-underline disabled:opacity-60">
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
            </button>
          </div>
          {DATA_MODE === 'mock' && <p className="text-[0.9375rem] text-muted">Demo mode: any 6 digits will do.</p>}
          <p className="text-muted">
            Wrong email?{' '}
            <button type="button" onClick={() => go('details')} className="font-semibold text-accent-text underline underline-offset-4">
              Start again
            </button>
          </p>
        </form>
      </AuthFrame>
    )
  }

  if (step === 'profile') {
    return (
      <AuthFrame title="One last thing" intro="Tell people who they’re renting from.">
        <form onSubmit={submitProfile} noValidate className="space-y-5">
          <FormError>{error}</FormError>
          {nameField}
          {areaSelect}
          {consentBlock}
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? 'Saving…' : 'Finish'}
          </Button>
        </form>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame
      title="Create your account"
      intro={
        <>
          Already have one?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-accent-text underline underline-offset-4">
            Log in
          </Link>
        </>
      }
      aside={
        <>
          <p className="font-display text-2xl leading-snug font-bold">Free to join. Free to list.</p>
          <ul className="mt-5 space-y-3 opacity-85">
            <li>Rent from people in your part of {LAUNCH_CITY}.</li>
            <li>Earn from the things in your cupboard.</li>
            <li>Your email stays private. Others see your first name and area.</li>
          </ul>
        </>
      }
    >
      <form onSubmit={submitDetails} noValidate className="space-y-5">
        <FormError>{error}</FormError>
        {nameField}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} hint="We’ll send a code to check it’s yours." />
        {areaSelect}
        <PasswordField label="Create a password" autoComplete="new-password" value={password} onChange={setPassword} error={fieldErrors.password} showRules />
        {consentBlock}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthFrame>
  )
}
