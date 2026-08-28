/**
 * Alternate unified scales for spacing scale lab.
 * Default production theme uses grid4. Dev switcher: ScalePresetProvider.
 */

export const SCALE_PRESET_IDS = ['grid4', 'fibonacci', 'modular'] as const
export type ScalePresetId = (typeof SCALE_PRESET_IDS)[number]
export const DEFAULT_SCALE_PRESET_ID: ScalePresetId = 'grid4'

export type BaseSpacingRecord = {
  xxxsmall: number
  xxsmall: number
  xsmall: number
  small: number
  medium: number
  large: number
  xlarge: number
  xxlarge: number
  xxxlarge: number
  xxxxlarge: number
  xxxxxlarge: number
  xxxxxxlarge: number
}

export type BorderRadiusRecord = {
  small: number
  medium: number
  large: number
}

export type IconSizeRecord = {
  xsmall: number
  small: number
  medium: number
  large: number
  xlarge: number
}

export type TypographyScaleRecord = {
  caption: number
  body2: number
  body1: number
  subtitle2: number
  subtitle1: number
  title2: number
  title1: number
  lhCaption: number
  lhBody2: number
  lhBody1: number
  lhSubtitle2: number
  lhSubtitle1: number
  lhTitle2: number
  lhTitle1: number
}

export type ScalePreset = {
  id: ScalePresetId
  label: string
  baseSpacing: BaseSpacingRecord
  borderRadiuses: BorderRadiusRecord
  iconSizes: IconSizeRecord
  typography: TypographyScaleRecord
}

const grid4: ScalePreset = {
  id: 'grid4',
  label: '4px grid',
  baseSpacing: {
    xxxsmall: 2,
    xxsmall: 4,
    xsmall: 8,
    small: 12,
    medium: 16,
    large: 24,
    xlarge: 32,
    xxlarge: 48,
    xxxlarge: 64,
    xxxxlarge: 96,
    xxxxxlarge: 128,
    xxxxxxlarge: 192,
  },
  borderRadiuses: { small: 2, medium: 3, large: 6 },
  iconSizes: { xsmall: 12, small: 14, medium: 16, large: 20, xlarge: 24 },
  typography: {
    caption: 12,
    body2: 14,
    body1: 16,
    subtitle2: 18,
    subtitle1: 20,
    title2: 24,
    title1: 30,
    lhCaption: 16,
    lhBody2: 20,
    lhBody1: 24,
    lhSubtitle2: 24,
    lhSubtitle1: 24,
    lhTitle2: 32,
    lhTitle1: 40,
  },
}

const fibonacci: ScalePreset = {
  id: 'fibonacci',
  label: 'Fibonacci',
  baseSpacing: {
    xxxsmall: 2,
    xxsmall: 3,
    xsmall: 5,
    small: 8,
    medium: 13,
    large: 21,
    xlarge: 34,
    xxlarge: 55,
    xxxlarge: 89,
    xxxxlarge: 144,
    xxxxxlarge: 192,
    xxxxxxlarge: 256,
  },
  borderRadiuses: { small: 2, medium: 5, large: 8 },
  iconSizes: { xsmall: 11, small: 13, medium: 16, large: 21, xlarge: 26 },
  typography: {
    caption: 11,
    body2: 13,
    body1: 16,
    subtitle2: 18,
    subtitle1: 21,
    title2: 26,
    title1: 34,
    lhCaption: 16,
    lhBody2: 21,
    lhBody1: 24,
    lhSubtitle2: 26,
    lhSubtitle1: 28,
    lhTitle2: 34,
    lhTitle1: 42,
  },
}

const modular: ScalePreset = {
  id: 'modular',
  label: 'Modular (~1.5×)',
  baseSpacing: {
    xxxsmall: 4,
    xxsmall: 6,
    xsmall: 9,
    small: 14,
    medium: 21,
    large: 32,
    xlarge: 48,
    xxlarge: 72,
    xxxlarge: 108,
    xxxxlarge: 162,
    xxxxxlarge: 243,
    xxxxxxlarge: 288,
  },
  borderRadiuses: { small: 3, medium: 5, large: 9 },
  iconSizes: { xsmall: 12, small: 14, medium: 17, large: 21, xlarge: 28 },
  typography: {
    caption: 12,
    body2: 14,
    body1: 17,
    subtitle2: 20,
    subtitle1: 24,
    title2: 28,
    title1: 36,
    lhCaption: 18,
    lhBody2: 21,
    lhBody1: 26,
    lhSubtitle2: 28,
    lhSubtitle1: 32,
    lhTitle2: 36,
    lhTitle1: 44,
  },
}

export const scalePresets: Record<ScalePresetId, ScalePreset> = {
  grid4,
  fibonacci,
  modular,
}

export function isScalePresetId(value: unknown): value is ScalePresetId {
  return (
    typeof value === 'string' &&
    SCALE_PRESET_IDS.includes(value as ScalePresetId)
  )
}

export function getScalePreset(id: ScalePresetId = DEFAULT_SCALE_PRESET_ID) {
  return scalePresets[id]
}
