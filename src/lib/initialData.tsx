import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

/**
 * Data a prerendered page was built with, so the browser can show it straight
 * away and take over the HTML without a mismatch. Keyed like "listing:<id>".
 */
type InitialData = Record<string, unknown>
const InitialDataContext = createContext<InitialData>({})

export function InitialDataProvider({ data, children }: { data: InitialData; children: ReactNode }) {
  return <InitialDataContext.Provider value={data}>{children}</InitialDataContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useInitialData<T>(key: string): T | undefined {
  return useContext(InitialDataContext)[key] as T | undefined
}

/** Read the data the prerender embedded in the page, if any. */
// oxlint-disable-next-line react/only-export-components
export function readEmbeddedData(): InitialData {
  try {
    const el = document.getElementById('__INITIAL_DATA__')
    return el?.textContent ? (JSON.parse(el.textContent) as InitialData) : {}
  } catch {
    return {}
  }
}

const noop = () => () => {}
/** False on the server and during hydration, true afterwards. For things that depend on "now". */
// oxlint-disable-next-line react/only-export-components
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}
