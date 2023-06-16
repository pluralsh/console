import { type CSSProperties } from 'styled-components'

import { prefixKeys } from '../utils/ts-utils'

export const colorsCloudShellDark = prefixKeys(
  {
    [`mid-grey`]: '#C5C9D3',
    [`dark-grey`]: '#747B8B',
    [`dark-red`]: '#F2788D',
    [`light-red`]: '#F599A8',
    [`green`]: '#3CECAF',
    [`dark-yellow`]: '#3CECAF',
    [`light-yellow`]: '#FFF9C2',
    [`blue`]: '#8FD6FF',
    [`dark-lilac`]: '#BE5EEB',
    [`light-lilac`]: '#D596F4',
    [`dark-purple`]: '#7075F5',
    [`light-purple`]: '#969AF8',
    [`light-grey`]: '#969AF8',
  } as const satisfies Record<string, CSSProperties['color']>,
  'cloud-shell-'
)
