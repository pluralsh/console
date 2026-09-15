import { createGlobalStyle, useTheme } from 'styled-components'

import {
  COLOR_THEME_KEY,
  type ColorMode,
  DEFAULT_COLOR_MODE,
  styledTheme as theme,
} from './theme'
import { getBoxShadows } from './theme/boxShadows'
import { baseColors } from './theme/colors-base'
import { semanticColorsDark } from './theme/colors-semantic-dark'
import { semanticColorsLight } from './theme/colors-semantic-light'

const {
  borderRadiuses,
  borders,
  borderStyles,
  borderWidths,
  fontFamilies,
  spacing,
} = theme

export const colorsToCSSVars: (colors: unknown) => any = (colors) => {
  function inner(colors: unknown, prefix = '') {
    if (!colors || typeof colors !== 'object') {
      return
    }

    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        ;(cssVars as any)[`--color-${prefix}${key}`] = value
      } else if (typeof value === 'object') {
        inner(value, `${prefix}${key}-`)
      }
    })
  }

  const cssVars = {}

  inner(colors)

  return cssVars
}

const semanticColorCSSVars = {
  dark: colorsToCSSVars(semanticColorsDark),
  light: colorsToCSSVars(semanticColorsLight),
}

const baseColorCSSVars = colorsToCSSVars(baseColors)

const getSemanticColorCSSVars = ({ mode }: { mode: ColorMode }) =>
  semanticColorCSSVars[mode] || semanticColorCSSVars[DEFAULT_COLOR_MODE]

const fontCSSVars = Object.fromEntries(
  Object.entries(fontFamilies).map(([name, value]) => [`--font-${name}`, value])
)
const getShadowCSSVars = ({ mode }: { mode: ColorMode }) =>
  Object.fromEntries(
    Object.entries(getBoxShadows({ mode })).map(([name, value]) => [
      `--box-shadow-${name}`,
      value,
    ])
  )
const spacingCSSVars = Object.fromEntries(
  Object.entries(spacing).map(([name, value]) => [
    `--space-${name}`,
    `${value}px`,
  ])
)
const radiiCSSVars = Object.fromEntries(
  Object.entries(borderRadiuses).map(([name, value]) => [
    `--radius-${name}`,
    `${value}px`,
  ])
)
const borderStylesCSSVars = Object.fromEntries(
  Object.entries(borderStyles).map(([name, value]) => [
    `--border-style-${name}`,
    value,
  ])
)
const borderWidthsToToCSSVars = Object.fromEntries(
  Object.entries(borderWidths).map(([name, value]) => [
    `--border-width-${name}`,
    `${value}px`,
  ])
)
const bordersToCSSVars = Object.fromEntries(
  Object.entries(borders).map(([name, value]) => [`--border-${name}`, value])
)

function cssSwapper(selPrimary: string, otherSel: string, limit = 6) {
  let str = selPrimary
  const selectors = [selPrimary]

  for (let i = 0; i < limit; ++i) {
    str += ` ${otherSel} ${selPrimary}`
    selectors.push(str)
  }
  const ret = selectors.join(',\n')

  return ret
}

const darkSelector = `[data-${COLOR_THEME_KEY}=dark]`
const lightSelector = `[data-${COLOR_THEME_KEY}=light]`
const lightModeSelectors = `html${lightSelector}:root,\n${cssSwapper(
  lightSelector,
  darkSelector
)}`
const darkModeSelectors = `html${darkSelector}:root,\n${cssSwapper(
  darkSelector,
  lightSelector
)}`

const GlobalStyleSheet = createGlobalStyle(({ theme }) => ({
  ':root': {
    ...baseColorCSSVars,
    ...getSemanticColorCSSVars({ mode: theme.mode }),
    ...fontCSSVars,
    ...getShadowCSSVars({ mode: theme.mode }),
    ...spacingCSSVars,
    ...radiiCSSVars,
    ...borderStylesCSSVars,
    ...borderWidthsToToCSSVars,
    ...bordersToCSSVars,
  },
  [darkModeSelectors]: {
    ...getSemanticColorCSSVars({ mode: 'dark' }),
  },
  [lightModeSelectors]: {
    ...getSemanticColorCSSVars({ mode: 'light' }),
  },
  '*, *::before, *::after': {
    boxSizing: 'border-box',
  },
  html: {
    fontSize: 14,
    lineHeight: 1.15,
    WebkitTextSizeAdjust: '100%',
  },
  // Keep html/body on the app-shell token (index.html reads --color-page-background).
  // This is intentionally NOT fill-zero.
  'html, body': {
    backgroundColor: theme.colors['page-background'],
    color: theme.colors.text,
    fontFamily: fontFamilies.sans,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  'h1, h2, h3, h4, h5, h6, p': {
    margin: 0,
  },
  'a, a:visited, a:hover, a:active': {
    color: 'inherit',
    textDecoration: 'inherit',
  },
  'button, input, optgroup, select, textarea': {
    fontFamily: 'inherit',
    fontSize: '100%',
    lineHeight: 1.15,
    margin: 0,
  },
  '::placeholder': {
    color: theme.colors['text-xlight'],
  },
  '*': theme.partials.scrollBar({ fillLevel: 0 }),
}))

function GlobalStyle() {
  const theme = useTheme()

  return (
    <>
      <GlobalStyleSheet />
      <div id={theme.portals.default.id} />
    </>
  )
}

export default GlobalStyle
