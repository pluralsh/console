import { mergeTheme } from 'honorable'
import mapperRecipe from 'honorable-recipe-mapper'
import defaultTheme from 'honorable-theme-default'

import { useState } from 'react'

import { useMutationObserver } from '@react-hooks-library/core'

import { getBorderRadiusesForScale } from './theme/borders'
import { borderStyles, borderWidths, borders } from './theme/borders'
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
import { getIconSizesForScale } from './theme/iconSizes'
import {
  DEFAULT_SCALE_PRESET_ID,
  type ScalePresetId,
} from './theme/scale-presets'
import { getSpacingForScale } from './theme/spacing'
import { getTextPartialsForScale } from './theme/text-scales'
import { visuallyHidden } from './theme/visuallyHidden'
import { zIndexes } from './theme/zIndexes'

export const COLOR_THEME_KEY = 'theme-mode'

export const COLOR_MODES = ['light', 'dark'] as const
export type ColorMode = (typeof COLOR_MODES)[number]
export const DEFAULT_COLOR_MODE: ColorMode = 'dark'

export type StringObj = { [key: string]: string | StringObj }

// old, phase this out once honorable is all removed
const spacers = {
  margin: ['margin'],
  marginTop: ['marginTop'],
  marginRight: ['marginRight'],
  marginBottom: ['marginBottom'],
  marginLeft: ['marginLeft'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  padding: ['padding'],
  paddingTop: ['paddingTop'],
  paddingRight: ['paddingRight'],
  paddingBottom: ['paddingBottom'],
  paddingLeft: ['paddingLeft'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
}

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

// remove any unused themes as we transition off honorable
// ultimately we'll be able to get rid of this entirely
const getHonorableThemeProps = ({
  mode,
  scaleId = DEFAULT_SCALE_PRESET_ID,
}: {
  mode: ColorMode
  scaleId?: ScalePresetId
}) => {
  const boxShadows = getBoxShadows({ mode })
  const scaleSpacing = getSpacingForScale(scaleId)
  const scaleBorderRadiuses = getBorderRadiusesForScale(scaleId)
  const scaleTextPartials = getTextPartialsForScale(scaleId)

  return {
    stylesheet: {
      html: [
        {
          fontSize: scaleTextPartials.body2.fontSize,
          fontFamily: fontFamilies.sans,
          backgroundColor: 'fill-zero',
        },
      ],
      '&::placeholder': [{ color: 'text-xlight' }],
    },
    global: [
      /* Spacing */
      mapperRecipe('gap', scaleSpacing),
      ...Object.entries(spacers).map(
        ([key, nextKeys]) =>
          (props: any) =>
            props[key] !== null &&
            typeof props[key] !== 'undefined' &&
            Object.fromEntries(
              nextKeys.map((nextKey) => [
                nextKey,
                (scaleSpacing as any)[props[key]] || props[key],
              ])
            )
      ),
      /* Border radiuses */
      mapperRecipe('borderRadius', scaleBorderRadiuses),
      /* Shadows */
      mapperRecipe('boxShadow', boxShadows),
      /* Texts */
      ({ h1 }: any) => h1 && scaleTextPartials.h1,
      ({ h2 }: any) => h2 && scaleTextPartials.h2,
      ({ h3 }: any) => h3 && scaleTextPartials.h3,
      ({ h4 }: any) => h4 && scaleTextPartials.h4,
      ({ title1 }: any) => title1 && scaleTextPartials.title1,
      ({ title2 }: any) => title2 && scaleTextPartials.title2,
      ({ subtitle1 }: any) => subtitle1 && scaleTextPartials.subtitle1,
      ({ subtitle2 }: any) => subtitle2 && scaleTextPartials.subtitle2,
      ({ body1, body2, bold }: any) => ({
        ...(body1 && scaleTextPartials.body1),
        ...(body2 && scaleTextPartials.body2),
        ...((body1 || body2) && bold && scaleTextPartials.bodyBold),
      }),
      ({ body2LooseLineHeight, bold }: any) => ({
        ...(body2LooseLineHeight && scaleTextPartials.body2LooseLineHeight),
        ...(body2LooseLineHeight && bold && scaleTextPartials.bodyBold),
      }),
      ({ caption }: any) => caption && scaleTextPartials.caption,
      ({ overline }: any) => overline && scaleTextPartials.overline,
      ({ truncate }: any) => truncate && scaleTextPartials.truncate,
    ],
    A: {
      Root: [
        { color: 'text' },
        ({ inline }: any) => inline && scaleTextPartials.inlineLink,
      ],
    },
    Avatar: {
      Root: [
        {
          backgroundColor: 'action-primary',
          borderRadius: 4, // TODO 3 or 6
          fontWeight: 400,
        },
      ],
    },
    H1: { Root: [{ fontFamily: 'Monument' }] },
    H2: { Root: [{ fontFamily: 'Monument' }] },
    H3: { Root: [{ fontFamily: 'Monument' }] },
    H4: { Root: [{ fontFamily: 'Monument' }] },
    H5: { Root: [{ fontFamily: 'Monument' }] },
    H6: { Root: [{ fontFamily: 'Monument' }] },
    Input: {
      Root: [
        {
          body2: true,
          display: 'flex',
          overflow: 'hidden',
          justifyContent: 'space-between',
          align: 'center',
          height: 'auto',
          minHeight: 'auto',
          width: 'auto',
          paddingTop: 0,
          paddingBottom: 0,
          paddingRight: 'medium',
          paddingLeft: 'medium',
          border: '1px solid border-input',
          borderRadius: 'medium',
          _focusWithin: {
            borderColor: 'border-outline-focused',
          },
        },
        ({ valid }: any) =>
          valid && {
            borderColor: 'border-outline',
          },
        ({ error }: any) =>
          error && {
            borderColor: 'border-danger',
          },
        ({ small }: any) =>
          small && {
            caption: true,
          },
        ({ disabled }: any) =>
          disabled && {
            backgroundColor: 'transparent',
            color: 'text-disabled',
            borderColor: 'border-disabled',
          },
      ],
      InputBase: [
        {
          width: '100%',
          flex: '1 1',
          height: '38px',
          lineHeight: '38px',
          color: 'text',
          _placeholder: {
            color: 'text-xlight',
          },
        },
        ({ small }: any) =>
          small && {
            height: '30px',
            lineHeight: '30px',
          },
        ({ large }: any) =>
          large && {
            height: '46px',
            lineHeight: '46px',
          },
        ({ disabled }: any) =>
          disabled && {
            backgroundColor: 'transparent',
            color: 'text-disabled',
            _placeholder: {
              color: 'text-disabled',
            },
          },
      ],
      TextArea: [
        {
          paddingLeft: 'medium',
          paddingRight: 'medium',
          lineHeight: 'inherit',
          paddingTop: 9,
          paddingBottom: 9,
        },
        ({ small }: any) =>
          small && {
            paddingTop: 7,
            paddingBottom: 7,
          },
        ({ large }: any) =>
          large && {
            paddingTop: 13,
            paddingBottom: 13,
          },
      ],
      StartIcon: [
        {
          marginRight: 'xsmall',
        },
        ({ disabled }: any) =>
          disabled && {
            '& *': {
              color: 'text-disabled',
            },
          },
      ],
      EndIcon: [
        {
          marginLeft: 'small',
        },
        ({ disabled }: any) =>
          disabled && {
            '& *': {
              color: 'text-disabled',
            },
          },
      ],
    },
    Menu: {
      Root: [
        {
          paddingTop: '4px',
          paddingBottom: '4px',
          backgroundColor: 'fill-two',
          border: '1px solid border',
          borderRadius: 'medium',
          boxShadow: 'moderate',
          elevation: 0, // reset from honorable-theme-default
        },
      ],
    },
    MenuItem: {
      Root: [
        {
          '& > div': { borderTop: '1px solid border-fill-two' },
          '&:first-of-type > div': { borderTop: 'none' },
        },
      ],
      Children: [
        {
          padding: '8px 16px',
        },
        ({ active }: any) =>
          active && {
            backgroundColor: 'fill-two-hover',
            borderColor: 'fill-two-hover',
          },
      ],
    },
  }
}

export function getHonorableTheme({
  mode,
  scaleId = DEFAULT_SCALE_PRESET_ID,
}: {
  mode: ColorMode
  scaleId?: ScalePresetId
}) {
  return mergeTheme(defaultTheme, {
    ...getBaseTheme({ mode }),
    colors: mode === 'dark' ? colorsDark : colorsLight,
    ...getHonorableThemeProps({ mode, scaleId }),
  })
}

export const honorableThemeDark = getHonorableTheme({ mode: 'dark' })

export const honorableThemeLight = getHonorableTheme({ mode: 'light' })

export const getStyledTheme = ({
  mode,
  scaleId = DEFAULT_SCALE_PRESET_ID,
}: {
  mode: ColorMode
  scaleId?: ScalePresetId
}) =>
  ({
    ...getBaseTheme({ mode }),
    ...{
      scaleId,
      spacing: getSpacingForScale(scaleId),
      iconSizes: getIconSizesForScale(scaleId),
      boxShadows: getBoxShadows({ mode }),
      borderRadiuses: getBorderRadiusesForScale(scaleId),
      fontFamilies,
      borders,
      borderStyles,
      borderWidths,
      zIndexes,
      portals,
      gradients,
      partials: {
        text: getTextPartialsForScale(scaleId),
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

export {
  DEFAULT_SCALE_PRESET_ID,
  SCALE_PRESET_IDS,
  isScalePresetId,
  scalePresets,
} from './theme/scale-presets'
export type { ScalePresetId } from './theme/scale-presets'

// Deprecate these later?
export const styledTheme = styledThemeDark
export default honorableThemeDark

export const setThemeColorMode = (
  mode: ColorMode,
  {
    dataAttrName = COLOR_THEME_KEY,
    element = document?.documentElement,
  }: {
    dataAttrName?: string
    element?: HTMLElement
  } = {}
) => {
  if (!element) {
    return
  }
  localStorage.setItem(dataAttrName, mode)
  element.setAttribute(`data-${dataAttrName}`, mode)
}

export const useThemeColorMode = ({
  dataAttrName = COLOR_THEME_KEY,
  defaultMode = 'dark',
  element = document?.documentElement,
}: {
  dataAttrName?: string
  defaultMode?: ColorMode
  element?: HTMLElement
} = {}) => {
  const attrName = `data-${dataAttrName}`
  const [thisTheme, setThisTheme] = useState(
    element?.getAttribute(attrName) || defaultMode
  )

  useMutationObserver(
    element,
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
