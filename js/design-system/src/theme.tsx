import { useState } from 'react'

import { useMutationObserver } from '@react-hooks-library/core'

import {
  borderRadiuses,
  borderStyles,
  borderWidths,
  borders,
} from './theme/borders'
import { getBoxShadows } from './theme/boxShadows'
import { baseColors } from './theme/colors-base'
import { semanticColorsDark } from './theme/colors-semantic-dark'
import { semanticColorsLight } from './theme/colors-semantic-light'
import { getFocusPartials } from './theme/focus'
import { fontFamilies } from './theme/fonts'
import gradients from './theme/gradients'
import { marketingTextPartials } from './theme/marketingText'
import { resetPartials } from './theme/resets'
import { scrollBar } from './theme/scrollBar'
import { spacing } from './theme/spacing'
import { textPartials } from './theme/text'
import { visuallyHidden } from './theme/visuallyHidden'
import { zIndexes } from './theme/zIndexes'

export const COLOR_THEME_KEY = 'theme-mode'

export const COLOR_MODES = ['light', 'dark'] as const
export type ColorMode = (typeof COLOR_MODES)[number]
export const DEFAULT_COLOR_MODE: ColorMode = 'dark'

export type StringObj = { [key: string]: string | StringObj }

const portals = {
  default: {
    id: 'honorable-portal',
  },
}

const colorsDark = {
  ...baseColors,
  ...semanticColorsDark,
} as const

const colorsLight = {
  ...baseColors,
  ...semanticColorsLight,
} as const

const getBaseTheme = ({ mode }: { mode: ColorMode }) =>
  ({
    name: 'Plural',
    mode,
    breakpoints: {
      // We'll add mobile breakpoints later
      desktopSmall: 1000,
      desktop: 1280,
      desktopLarge: 1440,
    },
  }) as const

const getStyledTheme = ({ mode }: { mode: ColorMode }) =>
  ({
    ...getBaseTheme({ mode }),
    ...{
      spacing,
      boxShadows: getBoxShadows({ mode }),
      borderRadiuses,
      fontFamilies,
      borders,
      borderStyles,
      borderWidths,
      zIndexes,
      portals,
      gradients,
      partials: {
        text: textPartials,
        marketingText: marketingTextPartials,
        focus: getFocusPartials(),
        scrollBar,
        reset: resetPartials,
        visuallyHidden,
        dropdown: {
          arrowTransition: ({ isOpen = false }) => ({
            transition: 'transform 0.1s ease',
            transform: `scaleY(${isOpen ? -1 : 1})`,
          }),
        },
      },
      colors: mode === 'dark' ? colorsDark : colorsLight,
    },
  }) as const

export const styledThemeDark = getStyledTheme({ mode: 'dark' })

export const styledThemeLight = {
  ...getStyledTheme({ mode: 'light' }),
  colors: colorsLight,
} as const

// Deprecate these later?
export const styledTheme = styledThemeDark
export default styledThemeDark

const getDocumentElement = () =>
  typeof document === 'undefined' ? undefined : document.documentElement

export const setThemeColorMode = (
  mode: ColorMode,
  {
    dataAttrName = COLOR_THEME_KEY,
    element,
  }: {
    dataAttrName?: string
    element?: HTMLElement
  } = {}
) => {
  const target = element ?? getDocumentElement()

  if (!target) {
    return
  }
  localStorage.setItem(dataAttrName, mode)
  target.setAttribute(`data-${dataAttrName}`, mode)
}

export const useThemeColorMode = ({
  dataAttrName = COLOR_THEME_KEY,
  defaultMode = 'dark',
  element,
}: {
  dataAttrName?: string
  defaultMode?: ColorMode
  element?: HTMLElement
} = {}) => {
  const resolvedElement = element ?? getDocumentElement()
  const attrName = `data-${dataAttrName}`
  const [thisTheme, setThisTheme] = useState(
    resolvedElement?.getAttribute(attrName) || defaultMode
  )

  useMutationObserver(
    resolvedElement,
    (mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation?.attributeName === attrName &&
          mutation.target instanceof HTMLElement
        ) {
          setThisTheme(mutation.target.getAttribute(attrName) || defaultMode)
        }
      })
    },
    { attributeFilter: [attrName] }
  )

  return thisTheme
}
