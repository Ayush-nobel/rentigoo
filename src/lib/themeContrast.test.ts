import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Every text colour in src/index.css must meet WCAG AA against the backgrounds
 * it's used on: 4.5:1 for text, 3:1 for control outlines and focus rings.
 * Reads the CSS itself, so a colour change that breaks contrast fails here.
 */
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`No ${selector} block in index.css`)
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6}|var\(--[\w-]+\))/gi)].map(([, k, v]) => [k, v.toLowerCase()]))
}
/** Follows var(--x) references until a hex colour, using the palette in :root for anything a block doesn't set. */
function resolve(t: Record<string, string>): Record<string, string> {
  const get = (k: string, depth = 0): string => {
    const v = t[k] ?? root[k]
    if (!v || depth > 8) throw new Error(`--${k} has no colour`)
    const ref = /^var\(--([\w-]+)\)$/.exec(v)
    return ref ? get(ref[1]!, depth + 1) : v
  }
  return Object.fromEntries(Object.keys({ ...root, ...t }).map((k) => [k, get(k)]))
}
const root = block(':root')
const palette = resolve(root)
const dark = resolve({ ...root, ...block(":root[data-theme='dark']") })
const lightScope = resolve({ ...root, ...block('.light-scope') })
const darkScope = resolve({ ...root, ...block('.dark-scope') })

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

function check(name: string, t: Record<string, string>, backgrounds: string[]) {
  describe(name, () => {
    for (const bg of backgrounds) {
      for (const fg of ['text', 'muted', 'accent-text', 'danger', 'success']) {
        it(`${fg} on ${bg} ≥ 4.5`, () => expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5))
      }
      for (const fg of ['line-strong', 'focus']) {
        it(`${fg} on ${bg} ≥ 3`, () => expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3))
      }
    }
    it('on-accent on accent ≥ 4.5', () => expect(ratio(t['on-accent']!, t.accent!)).toBeGreaterThanOrEqual(4.5))
    it('on-ink on ink ≥ 4.5', () => expect(ratio(t['on-ink']!, t.ink!)).toBeGreaterThanOrEqual(4.5))
  })
}

check('light theme', palette, ['bg', 'surface', 'surface-sunken'])
check('dark theme', dark, ['bg', 'surface', 'surface-sunken'])
describe('on yellow (.light-scope)', () => {
  it('text on accent ≥ 4.5', () => expect(ratio(lightScope.text!, lightScope.accent!)).toBeGreaterThanOrEqual(4.5))
  it('muted on surface ≥ 4.5', () => expect(ratio(lightScope.muted!, lightScope.surface!)).toBeGreaterThanOrEqual(4.5))
  it('ink outline on accent ≥ 3', () => expect(ratio(lightScope.ink!, lightScope.accent!)).toBeGreaterThanOrEqual(3))
})
describe('the palette', () => {
  it('names the brand colours', () => {
    expect([palette['brand-yellow'], palette['page-bg'], palette['card-bg'], palette['card-border'], palette.text, palette['text-secondary'], palette.dark]).toEqual(['#ffd84d', '#fbf7ee', '#ffffff', '#ede6d6', '#1c1b19', '#5f5e5a', '#161616'])
  })
  it('the wordmark reads on light and on the dark footer', () => {
    expect(ratio(palette.wordmark!, palette['page-bg']!)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(darkScope.wordmark!, darkScope.panel!)).toBeGreaterThanOrEqual(4.5)
  })
})
describe('dark strips (.dark-scope on panel)', () => {
  for (const fg of ['text', 'muted', 'accent-text']) {
    it(`${fg} on panel ≥ 4.5`, () => expect(ratio(darkScope[fg]!, darkScope.panel!)).toBeGreaterThanOrEqual(4.5))
  }
  it('focus on panel ≥ 3', () => expect(ratio(darkScope.focus!, darkScope.panel!)).toBeGreaterThanOrEqual(3))
  it('line-strong on panel ≥ 3', () => expect(ratio(darkScope['line-strong']!, darkScope.panel!)).toBeGreaterThanOrEqual(3))
  it('on-ink on ink ≥ 4.5', () => expect(ratio(darkScope['on-ink']!, darkScope.ink!)).toBeGreaterThanOrEqual(4.5))
})
