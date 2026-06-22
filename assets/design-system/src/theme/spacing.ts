import { DefaultTheme, StyledObject } from 'styled-components'
import { type PrefixKeys } from '../utils/ts-utils'

import {
  DEFAULT_SCALE_PRESET_ID,
  getScalePreset,
  type BaseSpacingRecord,
  type ScalePresetId,
} from './scale-presets'

export type SemanticSpacingKey = keyof typeof spacing

const negativePrefix = 'minus-' as const

export function buildSpacingFromBase(base: BaseSpacingRecord) {
  const negativeSpacing = Object.fromEntries(
    Object.entries(base).map(([key, val]) => [`${negativePrefix}${key}`, -val])
  ) as PrefixKeys<typeof base, typeof negativePrefix, number>

  return {
    none: 0,
    ...base,
    ...negativeSpacing,
  } as const satisfies Record<string, number>
}

export const baseSpacing = getScalePreset(DEFAULT_SCALE_PRESET_ID).baseSpacing

export const spacing = buildSpacingFromBase(baseSpacing)

export function getSpacingForScale(
  scaleId: ScalePresetId = DEFAULT_SCALE_PRESET_ID
) {
  return buildSpacingFromBase(getScalePreset(scaleId).baseSpacing)
}

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
          ? spacing[propValue as SemanticSpacingKey] || 0
          : propValue
    else rest[propKey] = propValue
  })

  return { rest, css: { ...spacerCssProps, ...props.css } }
}
