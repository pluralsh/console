import type { SemanticColorKey } from '@pluralsh/design-system'

export type ColorMode = 'light' | 'dark'

// Brand tokens shared with the marketing site (plural.sh). Keep these in sync
// with marketing's src/app/globals.css so the docs read as the same product.
export const PLURAL_BLUE = '#4a51f2'

type BrandTokens = {
  canvas: string
  surface: string
  'surface-muted': string
  'surface-hover': string
  'surface-sidebar': string
  ink: string
  body: string
  muted: string
  subtle: string
  line: string
  'line-strong': string
  accent: string
  'accent-ink': string
  'accent-tint': string
  'accent-line': string
  'on-accent': string
  'logo-mark': string
  'code-inline': string
  success: string
  warning: string
  danger: string
  violet: string
  'syntax-key': string
  'syntax-string': string
  'syntax-literal': string
  'grain-opacity': string
}

export type BrandColorKey = Exclude<keyof BrandTokens, 'grain-opacity'>

export const brandTokens: Record<ColorMode, BrandTokens> = {
  light: {
    canvas: '#fafafa',
    surface: '#ffffff',
    'surface-muted': '#f4f5f7',
    'surface-hover': '#f2f3fb',
    'surface-sidebar': '#f1f1f3',
    ink: '#0e1015',
    body: 'rgb(14 16 21 / 0.78)',
    muted: '#4f535c',
    subtle: '#8a8f99',
    line: 'rgb(14 16 21 / 0.1)',
    'line-strong': 'rgb(14 16 21 / 0.16)',
    accent: PLURAL_BLUE,
    'accent-ink': PLURAL_BLUE,
    'accent-tint': 'rgb(74 81 242 / 0.08)',
    'accent-line': 'rgb(74 81 242 / 0.3)',
    'on-accent': '#ffffff',
    'logo-mark': PLURAL_BLUE,
    'code-inline': '#eeeef4',
    success: '#067647',
    warning: '#b54708',
    danger: '#b42318',
    violet: '#6e3fd9',
    'syntax-key': '#3d44e6',
    'syntax-string': '#067647',
    'syntax-literal': '#d9480f',
    'grain-opacity': '0.13',
  },
  dark: {
    canvas: '#12131b',
    surface: '#191a25',
    'surface-muted': '#1e2030',
    'surface-hover': '#232538',
    'surface-sidebar': '#151620',
    ink: '#ecedf7',
    body: 'rgb(236 237 247 / 0.76)',
    muted: '#a3a6bd',
    subtle: '#6d7088',
    line: 'rgb(190 195 255 / 0.1)',
    'line-strong': 'rgb(190 195 255 / 0.18)',
    accent: PLURAL_BLUE,
    'accent-ink': '#9ea3ff',
    'accent-tint': 'rgb(74 81 242 / 0.16)',
    'accent-line': 'rgb(158 163 255 / 0.32)',
    'on-accent': '#ffffff',
    'logo-mark': '#ecedf7',
    'code-inline': '#232538',
    success: '#7ee2b8',
    warning: '#f5c97a',
    danger: '#f2a7a7',
    violet: '#c9b6ff',
    'syntax-key': '#b4b8ff',
    'syntax-string': '#7ffac1',
    'syntax-literal': '#f5c28d',
    'grain-opacity': '0.1',
  },
}

// Remaps the design system's semantic tokens onto the brand tokens above, so
// every design-system component (code blocks, callouts, tables, buttons…)
// picks up the marketing look without being forked. Keys left out keep their
// design-system value for that mode.
const semanticOverrides = (
  t: BrandTokens,
  mode: ColorMode
): Partial<Record<SemanticColorKey, string>> => {
  const light = mode === 'light'

  return {
    'page-background': t.canvas,

    'fill-zero': t.canvas,
    'fill-zero-raised': t['surface-muted'],
    'fill-zero-hover': t['surface-hover'],
    'fill-zero-selected': t['surface-hover'],
    'fill-one': t.surface,
    'fill-one-raised': t['surface-muted'],
    'fill-one-hover': t['surface-hover'],
    'fill-one-selected': t['surface-muted'],
    'fill-two': t['surface-muted'],
    'fill-two-raised': t['surface-muted'],
    'fill-two-hover': t['surface-hover'],
    'fill-two-selected': light ? '#e9eaf2' : '#2a2c42',
    'fill-three': light ? '#eef0f1' : '#232538',
    'fill-three-raised': light ? '#e9eaf2' : '#282a40',
    'fill-three-hover': light ? '#e5e7eb' : '#2c2f47',
    'fill-three-selected': light ? '#e5e7eb' : '#30334d',
    'fill-primary': t.accent,
    'fill-primary-hover': light ? '#3d44e6' : '#5d63f4',
    'fill-accent': t.canvas,

    'action-primary': t.accent,
    'action-primary-hover': light ? '#3d44e6' : '#5d63f4',
    'action-link-inactive': t.muted,
    'action-link-inactive-hover': t.ink,
    'action-link-active': t.ink,
    'action-link-active-hover': t.ink,
    'action-link-inline': t['accent-ink'],
    'action-link-inline-hover': light ? '#2f36c4' : '#c4c7ff',
    'action-link-inline-visited': t['accent-ink'],
    'action-link-inline-visited-hover': light ? '#2f36c4' : '#c4c7ff',

    border: t.line,
    'border-hairline': t.line,
    'border-fill-one': t.line,
    'border-fill-two': t['line-strong'],
    'border-fill-three': t['line-strong'],
    'border-input': t['line-strong'],
    'border-selected': t.ink,
    'border-primary': t.accent,
    'border-outline-focused': t.accent,
    'border-success': t.success,
    'border-warning': t.warning,
    'border-danger': t.danger,

    text: t.ink,
    'text-light': light ? 'rgb(14 16 21 / 0.86)' : 'rgb(236 237 247 / 0.88)',
    'text-xlight': t.muted,
    'text-long-form': t.body,
    'text-disabled': t.subtle,
    'text-primary-accent': t['accent-ink'],
    'text-primary-disabled': t.subtle,
    'text-success': t.success,
    'text-success-light': t.success,
    'text-warning': t.warning,
    'text-warning-light': t.warning,
    'text-danger': t.danger,
    'text-danger-light': t.danger,

    'icon-default': t.ink,
    'icon-light': t.muted,
    'icon-xlight': t.subtle,
    'icon-primary': t['accent-ink'],
    'icon-success': t.success,
    'icon-warning': t.warning,
    'icon-danger': t.danger,

    // Syntax colors follow the marketing site's code palette: teal / violet /
    // pink / amber / green on dark, deeper equivalents on light.
    ...(light
      ? {
          'code-block-light-grey': '#0e1015',
          'code-block-mid-grey': '#4f535c',
          'code-block-dark-grey': '#8a8f99',
          'code-block-purple': '#3d44e6',
          'code-block-dark-purple': '#5b2fc9',
          'code-block-mid-blue': '#0b7c88',
          'code-block-light-blue': '#2e6f9e',
          'code-block-dark-green': '#067647',
          'code-block-light-green': '#0f8a5f',
          'code-block-yellow': '#a35a00',
          'code-block-dark-lilac': '#a33a9f',
          'code-block-light-lilac': '#b04ead',
        }
      : {
          'code-block-light-grey': '#e5e7eb',
          'code-block-mid-grey': '#c5c9d2',
          'code-block-dark-grey': '#8a8f99',
          'code-block-purple': '#b4b8ff',
          'code-block-dark-purple': '#9ea3ff',
          'code-block-mid-blue': '#14d9d1',
          'code-block-light-blue': '#8fd6ff',
          'code-block-dark-green': '#7ffac1',
          'code-block-light-green': '#7ffac1',
          'code-block-yellow': '#f5c28d',
          'code-block-dark-lilac': '#e9ace6',
          'code-block-light-lilac': '#e9ace6',
        }),
  }
}

export const colorVarsForMode = (mode: ColorMode) => {
  const t = brandTokens[mode]
  const vars: Record<string, string> = {}

  for (const [key, value] of Object.entries(semanticOverrides(t, mode))) {
    vars[`--color-${key}`] = value as string
  }
  for (const [key, value] of Object.entries(t)) {
    vars[key === 'grain-opacity' ? '--grain-opacity' : `--color-${key}`] = value
  }

  return vars
}
