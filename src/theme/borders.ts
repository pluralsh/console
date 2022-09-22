import { semanticColors } from './colors'

export const borderWidths = {
  default: 1,
  focus: 1.5,
}

export const borderStyles = {
  default: 'solid',
}

export const borders = {
  default: `${borderWidths.default}px ${borderStyles.default} ${semanticColors.border}`,
  'fill-one': `${borderWidths.default}px ${borderStyles.default} ${semanticColors.border}`,
  'fill-two': `${borderWidths.default}px ${borderStyles.default} ${semanticColors['border-fill-two']}`,
  'fill-three': `${borderWidths.default}px ${borderStyles.default} ${semanticColors['border-input']}`,
  input: `${borderWidths.default}px ${borderStyles.default} ${semanticColors['border-input']}`,
}

export const borderRadiuses = {
  medium: 3,
  large: 6,
  normal: 3, // deprecated in favor of medium
}
