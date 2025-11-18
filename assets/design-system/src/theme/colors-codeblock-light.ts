import { type CSSProperties } from 'styled-components'

import { prefixKeys } from '../utils/ts-utils'

export const colorsCodeBlockLight = prefixKeys(
  {
    [`light-green`]: '#5DB999',
    [`dark-grey`]: '#383F4F',
    [`purple`]: '#5A5EBC',
    [`mid-blue`]: '#5DA4CD',
    [`yellow`]: '#C3B853',
    [`mid-grey`]: '#898D97',
    [`dark-green`]: '#00B073',
    [`dark-lilac`]: '#BE5EEB',
    [`light-lilac`]: '#D596F4',
    [`dark-purple`]: '#3439B9',
    [`light-grey`]: '#AFB3B4',
    [`light-blue`]: '#86ADC3',
  } as const satisfies Record<string, CSSProperties['color']>,
  'code-block-'
)
