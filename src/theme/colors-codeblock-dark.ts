import { type CSSProperties } from 'styled-components'

import { prefixKeys } from '../utils/ts-utils'

export const colorsCodeBlockDark = prefixKeys(
  {
    [`light-green`]: '#99F5D5',
    [`dark-grey`]: '#747B8B',
    [`purple`]: '#969AF8',
    [`mid-blue`]: '#8FD6FF',
    [`yellow`]: '#FFF48F',
    [`mid-grey`]: '#C5C9D3',
    [`dark-green`]: '#3CECAF',
    [`dark-purple`]: '#7075F5',
    [`light-grey`]: '#EBEFF0',
    [`light-blue`]: '#C2E9FF',
  } as const satisfies Record<string, CSSProperties['color']>,
  'code-block-'
)
