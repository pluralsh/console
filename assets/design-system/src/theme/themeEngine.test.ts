import chroma from 'chroma-js'

import { semanticColorsDark } from './colors-semantic-dark'
import {
  resolveFill,
  deriveSemanticColors,
  resolveThemeConfig,
} from './themeEngine'

describe('themeEngine', () => {
  it('resolveFill should lighten surfaces in dark mode', () => {
    const cfg = resolveThemeConfig({
      mode: 'dark',
      presetId: 'magic-blue',
      custom: { accent: '#D9E6FF', background: '#191A22', contrast: 50 },
    })

    const l0 = chroma(resolveFill('fill-zero', '', cfg)).luminance()
    const l1 = chroma(resolveFill('fill-one', '', cfg)).luminance()
    const l2 = chroma(resolveFill('fill-two', '', cfg)).luminance()
    const l3 = chroma(resolveFill('fill-three', '', cfg)).luminance()

    expect(l0).toBeLessThan(l1)
    expect(l1).toBeLessThan(l2)
    expect(l2).toBeLessThan(l3)

    const base = chroma(resolveFill('fill-two', '', cfg)).luminance()
    const hover = chroma(resolveFill('fill-two', '-hover', cfg)).luminance()
    const selected = chroma(
      resolveFill('fill-two', '-selected', cfg)
    ).luminance()

    expect(base).toBeLessThan(hover)
    expect(hover).toBeLessThan(selected)
  })

  it('resolveFill should darken surfaces in light mode', () => {
    const cfg = resolveThemeConfig({
      mode: 'light',
      presetId: 'pure-light',
      custom: { accent: '#111AEE', background: '#FFFFFF', contrast: 50 },
    })

    const l0 = chroma(resolveFill('fill-zero', '', cfg)).luminance()
    const l1 = chroma(resolveFill('fill-one', '', cfg)).luminance()
    const l2 = chroma(resolveFill('fill-two', '', cfg)).luminance()
    const l3 = chroma(resolveFill('fill-three', '', cfg)).luminance()

    expect(l0).toBeGreaterThan(l1)
    expect(l1).toBeGreaterThan(l2)
    expect(l2).toBeGreaterThan(l3)

    const base = chroma(resolveFill('fill-two', '', cfg)).luminance()
    const hover = chroma(resolveFill('fill-two', '-hover', cfg)).luminance()
    const selected = chroma(
      resolveFill('fill-two', '-selected', cfg)
    ).luminance()

    expect(base).toBeGreaterThan(hover)
    expect(hover).toBeGreaterThan(selected)
  })

  it('contrast=0 should return base background for all fills', () => {
    const cfg = resolveThemeConfig({
      mode: 'dark',
      presetId: 'custom',
      custom: { accent: '#D9E6FF', background: '#191A22', contrast: 0 },
    })

    ;(['fill-zero', 'fill-one', 'fill-two', 'fill-three'] as const).forEach(
      (lvl) => {
        ;(['', '-hover', '-selected'] as const).forEach((suffix) => {
          expect(resolveFill(lvl, suffix, cfg).toLowerCase()).toBe(
            cfg.background.toLowerCase()
          )
        })
      }
    )
  })

  it('derived colors should include all semantic keys', () => {
    const derived = deriveSemanticColors({ mode: 'dark', presetId: 'dark' })

    Object.keys(semanticColorsDark).forEach((k) => {
      expect(typeof derived[k]).toBe('string')
      expect(derived[k]).toBeTruthy()
    })
  })
})
