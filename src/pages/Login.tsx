import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { emailProblem, passwordProblem } from '@shared/accountRules'
import { AuthFrame, CodeField, FormError, PasswordField } from '@/components/auth/AuthFields'
import { Seo } from '@/components/layout/Seo'
import { STATIC_PAGES } from '@/lib/seo'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { auth, AuthError, DATA_MODE, safeNext } from '@/lib'

type Mode = 'login' | 'forgot' | 'reset'

const NOTICES: Record<string, string> = {
  confirmed: 'Your email is confirmed. Log in to finish setting up your account.',
  reset: 'Password changed. Log in with your new one.',
  'signed-out': 'You’ve been logged out.',
}

export default function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { status, refresh } = useAuth()
  const next = safeNext(params.get('next'))
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(NOTICES[params.get('notice') ?? ''] ?? null)


  if (status === 'signed-in') return <Navigate to={next} replace />

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const submitLogin = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const ep = emailProblem(email)
    if (ep) errs.email = ep
    if (!password) errs.password = 'Enter your password.'
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    void run(async () => {
      const result = await auth.signIn(email, password)
      if (result === 'confirm-email') {
        navigate(`/signup?step=confirm&email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`)
        return
      }
      if (result === 'reset-password') {
        setMode('reset')
        setNotice('Please choose a new password. We’ve emailed you a code.')
        return
      }
      const s = await refresh()
      navigate(s === 'needs-profile' ? `/signup?step=profile&next=${encodeURIComponent(next)}` : next, { replace: true })
    })
  }

  const submitForgot = (e: FormEvent) => {
    e.preventDefault()
    const ep = emailProblem(email)
    setFieldErrors(ep ? { email: ep } : {})
    if (ep) return
    void run(async () => {
      await auth.startPasswordReset(email)
      setMode('reset')
      setNotice(`If ${email.trim()} has an account, we’ve emailed it a 6-digit code.`)
    })
  }

  const submitReset = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/^\d{6}$/.test(code)) errs.code = 'Enter the 6-digit code from the email.'
    const pp = passwordProblem(password)
    if (pp) errs.password = pp
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    void run(async () => {
      await auth.finishPasswordReset(email, code, password)
      setMode('login')
      setPassword('')
      setCode('')
      setNotice(NOTICES.reset!)
    })
  }

  return (
    <>
    <Seo {...STATIC_PAGES['/login']!} title={mode === 'login' ? 'Log in' : 'Reset your password'} />
    <AuthFrame
      title={mode === 'login' ? 'Welcome back' : 'Reset your password'}
      intro={
        mode === 'login' ? (
          <>
            New to RentiGoo?{' '}
            <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-accent-text underline underline-offset-4">
              Create an account
            </Link>
          </>
        ) : (
          'We’ll email you a code to set a new one.'
        )
      }
      aside={<Aside />}
    >
      <div className="space-y-5">
        {notice && (
          <p role="status" className="rounded-field bg-sunken p-3 font-medium">
            {notice}
          </p>
        )}
        <FormError>{error}</FormError>

        {mode === 'login' && (
          <form onSubmit={submitLogin} noValidate className="space-y-5">
            <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
            <PasswordField label="Password" autoComplete="current-password" value={password} onChange={setPassword} error={fieldErrors.password} />
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? 'Logging in…' : 'Log in'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot')
                  setError(null)
                  setNotice(null)
                  setFieldErrors({})
                }}
                className="min-h-11 rounded font-semibold underline underline-offset-4"
              >
                Forgot your password?
              </button>
            </div>
            {DATA_MODE === 'mock' && (
              <p className="text-[0.9375rem] text-muted">Demo mode: log in as ananya.demo@example.com with any password.</p>
            )}
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={submitForgot} noValidate className="space-y-5">
            <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? 'Sending…' : 'Email me a code'}
              </Button>
              <BackToLogin onClick={() => setMode('login')} />
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={submitReset} noValidate className="space-y-5">
            <CodeField value={code} onChange={setCode} error={fieldErrors.code} />
            <PasswordField label="New password" autoComplete="new-password" value={password} onChange={setPassword} error={fieldErrors.password} showRules />
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? 'Saving…' : 'Set new password'}
              </Button>
              <BackToLogin onClick={() => setMode('login')} />
            </div>
          </form>
        )}
      </div>
    </AuthFrame>
    </>
  )
}

function BackToLogin({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded font-semibold underline underline-offset-4">
      Back to log in
    </button>
  )
}

function Aside() {
  return (
    <>
      <p className="font-display text-2xl leading-snug font-semibold">Log in to see your bookings, messages and listings.</p>
    </>
  )
}
