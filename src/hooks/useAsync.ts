import { useCallback, useEffect, useState, type DependencyList } from 'react'

export type AsyncState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: Error }

/**
 * Run an async loader when `deps` change; ignores stale results.
 * `reload()` re-runs it (e.g. after a mutation).
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  opts: { initial?: T } = {},
): AsyncState<T> & { reload: () => void } {
  // With initial data (from the prerender) we show it at once and refresh quietly.
  const [state, setState] = useState<AsyncState<T>>(() =>
    opts.initial !== undefined
      ? { status: 'success', data: opts.initial, error: undefined }
      : { status: 'loading', data: undefined, error: undefined },
  )
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    loader().then(
      (data) => live && setState({ status: 'success', data, error: undefined }),
      (e: unknown) => live && setState({ status: 'error', data: undefined, error: e instanceof Error ? e : new Error(String(e)) }),
    )
    return () => {
      live = false
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}

/** Set the browser tab title for a page. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · RentiGoo` : 'RentiGoo · Rent what you need, from people nearby'
  }, [title])
}
