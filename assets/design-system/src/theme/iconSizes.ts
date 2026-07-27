import {
  DEFAULT_SCALE_PRESET_ID,
  getScalePreset,
  type IconSizeRecord,
  type ScalePresetId,
} from './scale-presets'

export const iconSizes = getScalePreset(DEFAULT_SCALE_PRESET_ID).iconSizes

export function getIconSizesForScale(
  scaleId: ScalePresetId = DEFAULT_SCALE_PRESET_ID
): IconSizeRecord {
  return getScalePreset(scaleId).iconSizes
}

export const DEFAULT_ICON_SIZE = iconSizes.medium
