import {
  semanticColorCssVars,
  styledThemeDark,
  styledThemeLight,
} from '@pluralsh/design-system'

import type { DefaultTheme } from 'styled-components'

import { type BrandColorKey, brandTokens, type ColorMode } from './palette'

const dsFonts = styledThemeLight.fontFamilies

export const fontFamilies = {
  sans: '"Articulat", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: '"Newsreader", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
} as const

const fontMap: Record<string, string> = {
  [dsFonts.sans]: fontFamilies.sans,
  [dsFonts.semi]: fontFamilies.sans,
  [dsFonts.sansHero]: fontFamilies.sans,
  [dsFonts.mono]: fontFamilies.mono,
}

// Articulat ships in 400 and 500 only; clamp heavier weights so the browser
// doesn't synthesize a faux bold.
const mapWeight = (w: unknown) => {
  const n = typeof w === 'string' ? Number.parseInt(w, 10) : w

  if (typeof n !== 'number' || Number.isNaN(n)) return w

  return n > 500 ? 500 : n < 400 ? 400 : n
}

// Walks a design-system partials object and swaps its font stacks/weights for
// the docs ones, leaving every other declaration intact.
function retypeset<T>(partials: T): T {
  if (typeof partials === 'function') {
    return ((...args: unknown[]) =>
      retypeset((partials as (...a: unknown[]) => unknown)(...args))) as T
  }
  if (!partials || typeof partials !== 'object') return partials

  return Object.fromEntries(
    Object.entries(partials).map(([key, value]) => {
      if (key === 'fontFamily' && typeof value === 'string') {
        return [key, fontMap[value] ?? value]
      }
      if (key === 'fontWeight') return [key, mapWeight(value)]

      return [key, retypeset(value)]
    })
  ) as T
}

// Brand colors as CSS-variable references. They're mode-independent (the
// variables swap per mode), so components import them directly rather than
// reading them off the styled theme.
export const brand = Object.fromEntries(
  (Object.keys(brandTokens.light) as (keyof typeof brandTokens.light)[])
    .filter((key) => key !== 'grain-opacity')
    .map((key) => [key, `var(--color-${key})`])
) as Record<BrandColorKey, string>

const c = brand

export const docsText = {
  pageTitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: 400,
    fontSize: 'clamp(36px, 4.4vw, 52px)',
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
    color: c.ink,
  },
  lead: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 1.5,
    color: c.muted,
  },
  eyebrow: {
    fontFamily: fontFamilies.mono,
    fontVariantLigatures: 'none',
    fontSize: 12,
    lineHeight: 1.4,
    fontWeight: 400,
    letterSpacing: 0,
    color: c.muted,
  },
  label: {
    fontFamily: fontFamilies.mono,
    fontVariantLigatures: 'none',
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 400,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: c.muted,
  },
} as const

const heading = (fontSize: number, lineHeight: number) =>
  ({
    fontFamily: fontFamilies.sans,
    fontSize,
    lineHeight,
    fontWeight: 500,
    letterSpacing: '-0.005em',
    color: c.ink,
  }) as const

const display = (fontSize: number) =>
  ({
    fontFamily: fontFamilies.serif,
    fontSize,
    lineHeight: 1.1,
    fontWeight: 400,
    letterSpacing: '-0.02em',
    color: c.ink,
  }) as const

const body1 = {
  fontFamily: fontFamilies.sans,
  fontSize: 18,
  lineHeight: 1.6,
  fontWeight: 400,
  letterSpacing: '0.01em',
  color: c.body,
} as const

const body2 = {
  fontFamily: fontFamilies.sans,
  fontSize: 16,
  lineHeight: 1.7,
  fontWeight: 400,
  letterSpacing: '0.01em',
  color: c.body,
} as const

const bodyBold = { fontWeight: 500, color: c.ink } as const

const inlineLinkHover = semanticColorCssVars['action-link-inline-hover']

// The docs markdoc variant reads its typography from `marketingText`, so this
// is where long-form content gets the marketing site's prose styles.
const marketingText = {
  ...retypeset(styledThemeLight.partials.marketingText),
  bigHeader: display(56),
  hero1: display(44),
  hero2: display(36),
  title1: heading(24, 1.3),
  title2: heading(20, 1.35),
  subtitle1: heading(17, 1.4),
  subtitle2: heading(16, 1.5),
  body1,
  body2,
  bodyBold,
  body1Bold: { ...body1, ...bodyBold },
  body2Bold: { ...body2, ...bodyBold },
  inlineLink: {
    color: c['accent-ink'],
    textDecoration: 'underline',
    textDecorationThickness: 1,
    textUnderlineOffset: 3,
    textDecorationColor: c['accent-line'],
    '&:hover': {
      color: inlineLinkHover,
      textDecorationColor: 'currentColor',
    },
    '&:visited, &:active': {
      color: c['accent-ink'],
      '&:hover': { color: inlineLinkHover },
    },
  },
  navLink: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 400,
    letterSpacing: '0.01em',
    color: c.muted,
    '&:hover': { color: c.ink },
  },
  standaloneLink: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 1.5,
    fontWeight: 500,
    letterSpacing: '0.01em',
    color: c.ink,
    cursor: 'pointer',
    '&:hover': { color: c['accent-ink'] },
  },
  label: docsText.label,
} as const

function getDocsTheme(mode: ColorMode) {
  const base = mode === 'light' ? styledThemeLight : styledThemeDark

  return {
    ...base,
    mode,
    fontFamilies: {
      ...base.fontFamilies,
      sans: fontFamilies.sans,
      semi: fontFamilies.sans,
      sansHero: fontFamilies.sans,
      mono: fontFamilies.mono,
    },
    borderRadiuses: { medium: 4, large: 6 },
    partials: {
      ...base.partials,
      text: retypeset(base.partials.text),
      marketingText,
    },
    // Colors resolve through CSS variables (set per mode in DocsColorVars) so
    // switching modes is a single attribute flip with no flash on load.
    colors: {
      ...base.colors,
      ...semanticColorCssVars,
    },
  } as const
}

// The design-system theme is typed with literal values, so swapping fonts and
// radii needs a cast; the shape is unchanged.
export const docsThemeLight = getDocsTheme('light') as unknown as DefaultTheme
export const docsThemeDark = getDocsTheme('dark') as unknown as DefaultTheme
