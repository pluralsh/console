import {
  DEFAULT_SCALE_PRESET_ID,
  getScalePreset,
  type ScalePresetId,
  type TypographyScaleRecord,
} from './scale-presets'
import { textPartials as grid4TextPartials } from './text'

function px(n: number) {
  return `${n}px`
}

function applyTypographyScale(
  partials: typeof grid4TextPartials,
  t: TypographyScaleRecord
): typeof grid4TextPartials {
  return {
    ...partials,
    title1: {
      ...partials.title1,
      fontSize: t.title1,
      lineHeight: px(t.lhTitle1),
    },
    title2: {
      ...partials.title2,
      fontSize: t.title2,
      lineHeight: px(t.lhTitle2),
    },
    subtitle1: {
      ...partials.subtitle1,
      fontSize: t.subtitle1,
      lineHeight: px(t.lhSubtitle1),
    },
    subtitle2: {
      ...partials.subtitle2,
      fontSize: t.subtitle2,
      lineHeight: px(t.lhSubtitle2),
    },
    body1: {
      ...partials.body1,
      fontSize: t.body1,
      lineHeight: px(t.lhBody1),
    },
    body2: {
      ...partials.body2,
      fontSize: t.body2,
      lineHeight: px(t.lhBody2),
    },
    body1Bold: {
      ...partials.body1Bold,
      fontSize: t.body1,
      lineHeight: px(t.lhBody1),
    },
    body2Bold: {
      ...partials.body2Bold,
      fontSize: t.body2,
      lineHeight: px(t.lhBody2),
    },
    body2LooseLineHeight: {
      ...partials.body2LooseLineHeight,
      fontSize: t.body2,
    },
    body2LooseLineHeightBold: {
      ...partials.body2LooseLineHeightBold,
      fontSize: t.body2,
    },
    caption: {
      ...partials.caption,
      fontSize: t.caption,
      lineHeight: px(t.lhCaption),
    },
    badgeLabel: {
      ...partials.badgeLabel,
      fontSize: t.caption,
    },
    buttonMedium: {
      ...partials.buttonMedium,
      fontSize: t.body2,
    },
    buttonSmall: {
      ...partials.buttonSmall,
      fontSize: t.caption,
    },
    buttonLarge: {
      ...partials.buttonLarge,
      fontSize: t.body1,
    },
    overline: {
      ...partials.overline,
      fontSize: t.caption,
      lineHeight: px(t.lhCaption),
    },
    code: {
      ...partials.code,
      fontSize: t.body2,
    },
  } as typeof grid4TextPartials
}

export function getTextPartialsForScale(
  scaleId: ScalePresetId = DEFAULT_SCALE_PRESET_ID
) {
  if (scaleId === DEFAULT_SCALE_PRESET_ID) return grid4TextPartials
  return applyTypographyScale(
    grid4TextPartials,
    getScalePreset(scaleId).typography
  )
}
