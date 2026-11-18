import { BadgeCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AuthFrame } from '@/components/auth/AuthFields'
import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { api, ApiError } from '@/lib'

/** Where DigiLocker sends people back to: finishes the ID check and says how it went. */
export default function IdCheckReturn() {
  const [params] = useSearchParams()
  const requestId = params.get('id') ?? ''
  const ok = /^true$/i.test(params.get('success') ?? '')
  const cancelled = !ok || !requestId
  const [result, setResult] = useState<{ done: boolean; error?: string }>({ done: false })
  const started = useRef(false)
  const state = cancelled ? { done: true, error: params.get('errMessage') ?? 'The ID check was cancelled in DigiLocker. Nothing was shared.' } : result

  useEffect(() => {
    if (cancelled || started.current) return
    started.current = true
    api.finishIdCheck(requestId).then(
      () => setResult({ done: true }),
      (e: unknown) => setResult({ done: true, error: e instanceof ApiError ? e.message : 'The ID check didn’t finish. Please try again from Account.' }),
    )
  }, [cancelled, requestId])

  return (
    <>
      <Seo title="ID check" description="" noindex />
      <AuthFrame title={!state.done ? 'Checking your ID' : state.error ? 'Your ID isn’t checked' : 'Your ID is checked'}>
        <div role="status">
          {!state.done ? (
            <p className="text-lg text-muted">Just a moment…</p>
          ) : state.error ? (
            <p className="text-lg">{state.error}</p>
          ) : (
            <p className="flex items-center gap-2 text-lg font-semibold text-success">
              <BadgeCheck aria-hidden="true" className="size-6" /> Others now see an “ID checked” badge on your profile.
            </p>
          )}
        </div>
        {state.done && (
          <ButtonLink to="/account" className="mt-6">
            Back to your account
          </ButtonLink>
        )}
      </AuthFrame>
    </>
  )
}
