import { BadgeCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AuthFrame } from '@/components/auth/AuthFields'
import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { ID_NEXT_KEY } from '@/hooks/useIdNeeded'
import { api, ApiError } from '@/lib'

/** Where DigiLocker sends people back to: finishes the ID check and says how it went. */
export default function IdCheckReturn() {
  const [params] = useSearchParams()
  const { refresh } = useAuth()
  const requestId = params.get('id') ?? ''
  const ok = /^true$/i.test(params.get('success') ?? '')
  const cancelled = !ok || !requestId
  const [result, setResult] = useState<{ done: boolean; error?: string }>({ done: false })
  const started = useRef(false)
  // Where the person was (a listing they wanted to rent, or the listing form), saved before DigiLocker.
  const [next] = useState(() => {
    try {
      const n = sessionStorage.getItem(ID_NEXT_KEY)
      return n && n.startsWith('/') && !n.startsWith('//') ? n : null
    } catch {
      return null
    }
  })
  const state = cancelled ? { done: true, error: params.get('errMessage') ?? 'The ID check was cancelled in DigiLocker. Nothing was shared.' } : result

  useEffect(() => {
    if (cancelled || started.current) return
    started.current = true
    api.finishIdCheck(requestId).then(
      // Reload the profile so the rest of the app sees the checked ID straight away.
      () => refresh().finally(() => setResult({ done: true })),
      (e: unknown) => setResult({ done: true, error: e instanceof ApiError ? e.message : 'The ID check didn’t finish. Please try again from Account.' }),
    )
  }, [cancelled, requestId, refresh])

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
              <BadgeCheck aria-hidden="true" className="size-6" /> You can now list and rent, and others see an “ID checked” badge on your profile.
            </p>
          )}
        </div>
        {state.done && (
          <div className="mt-6 flex flex-wrap gap-3">
            {next && !state.error && (
              <ButtonLink to={next} onClick={() => sessionStorage.removeItem(ID_NEXT_KEY)}>
                {/^\/list(\?|$)/.test(next) ? 'Back to your listing' : 'Continue to your request'}
              </ButtonLink>
            )}
            <ButtonLink to={next && state.error ? next : '/account'} variant={next && !state.error ? 'outline' : undefined}>
              {next && state.error ? 'Go back' : 'Back to your account'}
            </ButtonLink>
          </div>
        )}
      </AuthFrame>
    </>
  )
}
