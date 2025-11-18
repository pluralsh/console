import { type CSSProperties } from 'react'

import { semanticColorCssVars } from './colors'

export type SemanticBorderKey = keyof typeof borders

export const borderWidths = {
  default: 1,
  focus: 1,
} as const satisfies Record<string, number>

export const borderStyles = {
  default: 'solid',
} as const satisfies Record<string, CSSProperties['borderStyle']>

export const borders = {
  default: `${borderWidths.default}px ${borderStyles.default} ${semanticColorCssVars.border}`,
  'fill-one': `${borderWidths.default}px ${borderStyles.default} ${semanticColorCssVars['border-fill-one']}`,
  'fill-two': `${borderWidths.default}px ${borderStyles.default} ${semanticColorCssVars['border-fill-two']}`,
  'fill-three': `${borderWidths.default}px ${borderStyles.default} ${semanticColorCssVars['border-fill-three']}`,
  input: `${borderWidths.default}px ${borderStyles.default} ${semanticColorCssVars['border-input']}`,
  'outline-focused': `${borderWidths.default}px ${borderStyles.default} ${semanticColorCssVars['border-outline-focused']}`,
  selected: `${borderWidths.default}px ${borderStyles.default} ${semanticColorCssVars['border-selected']}`,
} as const satisfies Record<string, CSSProperties['border']>

export const borderRadiuses = {
  medium: 3,
  large: 6,
} as const satisfies Record<string, number>
