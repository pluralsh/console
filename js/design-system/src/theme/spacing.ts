import { DefaultTheme, StyledObject } from 'styled-components'
import { type PrefixKeys } from '../utils/ts-utils'
import { pxToRem } from './rem'

export type SemanticSpacingKey = keyof typeof spacing

// Pixel values at the 16px reference root. Only use these for JS geometry
// that can't take CSS lengths (SVG coords, virtualizer sizes, canvas, etc).
export const baseSpacingPx = {
  xxxsmall: 2, //      0.125rem
  xxsmall: 4, //       0.25rem
  xsmall: 8, //        0.5rem
  small: 12, //        0.75rem
  medium: 16, //       1rem
  large: 24, //        1.5rem
  xlarge: 32, //       2rem
  xxlarge: 48, //      3rem
  xxxlarge: 64, //     4rem
  xxxxlarge: 96, //    6rem
  xxxxxlarge: 128, //  8rem
  xxxxxxlarge: 192, // 12rem
} as const satisfies Record<string, number>

type BaseSpacingKey = keyof typeof baseSpacingPx

const negativePrefix = 'minus-' as const

function mapSpacing<V>(fn: (px: number) => V) {
  const base = Object.fromEntries(
    Object.entries(baseSpacingPx).map(([key, px]) => [key, fn(px)])
  ) as Record<BaseSpacingKey, V>
  const negative = Object.fromEntries(
    Object.entries(baseSpacingPx).map(([key, px]) => [
      `${negativePrefix}${key}`,
      fn(-px),
    ])
  ) as PrefixKeys<typeof baseSpacingPx, typeof negativePrefix, V>

  return { none: fn(0), ...base, ...negative }
}

export const baseSpacing = Object.fromEntries(
  Object.entries(baseSpacingPx).map(([key, px]) => [key, pxToRem(px)])
) as Record<BaseSpacingKey, string>

export const spacing = mapSpacing(pxToRem)
export const spacingPx = mapSpacing((px) => px)

const SIZING_KEYS = [
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
] as const
const spacerKeys = new Set<string>(SIZING_KEYS)

type SpacerKey = (typeof SIZING_KEYS)[number]
export type SpacerProps<T = SemanticSpacingKey | number> = {
  [key in SpacerKey]?: T
}

// separates out semantic spacing props, resolves them, and adds them to the css style object
export function resolveSpacersAndSanitizeCss(
  props: Record<string, any> & { css?: StyledObject },
  { spacing }: DefaultTheme
): { rest: Record<string, any>; css: StyledObject } {
  const spacerCssProps: StyledObject = {}
  const rest: Record<string, any> = {}
  Object.entries(props).forEach(([propKey, propValue]) => {
    if (spacerKeys.has(propKey))
      spacerCssProps[propKey] =
        typeof propValue === 'string'
          ? (spacing[propValue as SemanticSpacingKey] ?? propValue)
          : propValue
    else rest[propKey] = propValue
  })

  return { rest, css: { ...spacerCssProps, ...props.css } }
}
