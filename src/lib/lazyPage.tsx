import { lazy, type ComponentType } from 'react'

type Loader<P> = () => Promise<{ default: ComponentType<P> }>
export type PreloadablePage<P = object> = ComponentType<P> & { preload: () => Promise<void> }

/**
 * Like React.lazy, but can be loaded ahead of time. Once loaded it renders the
 * page directly (no suspending), so a prerendered page can be taken over in one
 * pass; otherwise React may discard the server HTML and redraw it.
 */
export function lazyPage<P extends object>(loader: Loader<P>): PreloadablePage<P> {
  let Loaded: ComponentType<P> | null = null
  const load = () =>
    loader().then((m) => {
      Loaded = m.default
      return m
    })
  const Lazy = lazy(load)
  function Page(props: P) {
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />
  }
  Page.preload = async () => {
    if (!Loaded) await load()
  }
  return Page as PreloadablePage<P>
}
