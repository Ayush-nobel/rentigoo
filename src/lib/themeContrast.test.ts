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
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, k, v]) => [k, v.toLowerCase()]))
}
const root = block(':root')
const dark = { ...root, ...block(":root[data-theme='dark']") }
const lightScope = { ...root, ...block('.light-scope') }
const darkScope = { ...root, ...block('.dark-scope') }

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

check('light theme', root, ['bg', 'surface', 'surface-sunken'])
check('dark theme', dark, ['bg', 'surface', 'surface-sunken'])
describe('on yellow (.light-scope)', () => {
  it('text on accent ≥ 4.5', () => expect(ratio(lightScope.text!, lightScope.accent!)).toBeGreaterThanOrEqual(4.5))
  it('muted on surface ≥ 4.5', () => expect(ratio(lightScope.muted!, lightScope.surface!)).toBeGreaterThanOrEqual(4.5))
  it('ink outline on accent ≥ 3', () => expect(ratio(lightScope.ink!, lightScope.accent!)).toBeGreaterThanOrEqual(3))
})
describe('dark strips (.dark-scope on panel)', () => {
  for (const fg of ['text', 'muted', 'accent-text']) {
    it(`${fg} on panel ≥ 4.5`, () => expect(ratio(darkScope[fg]!, darkScope.panel!)).toBeGreaterThanOrEqual(4.5))
  }
  it('focus on panel ≥ 3', () => expect(ratio(darkScope.focus!, darkScope.panel!)).toBeGreaterThanOrEqual(3))
  it('line-strong on panel ≥ 3', () => expect(ratio(darkScope['line-strong']!, darkScope.panel!)).toBeGreaterThanOrEqual(3))
  it('on-ink on ink ≥ 4.5', () => expect(ratio(darkScope['on-ink']!, darkScope.ink!)).toBeGreaterThanOrEqual(4.5))
})
