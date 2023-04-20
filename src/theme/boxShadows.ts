import chroma from 'chroma-js'
import { type CSSProperties } from 'react'

import { borderWidths } from './borders'

import { grey, semanticColors } from './colors'

export const boxShadows = {
  slight: `0px 2px 4px ${chroma(grey[950]).alpha(0.14)}, 0px 2px 7px ${chroma(
    grey[950]
  ).alpha(0.18)}`,
  moderate: `0px 3px 6px ${chroma(grey[950]).alpha(
    0.2
  )}, 0px 10px 20px ${chroma(grey[950]).alpha(0.3)}`,
  modal: `0px 20px 50px ${chroma(grey[950]).alpha(0.6)}`,
  focused: `0px 0px 0px ${borderWidths.focus}px ${semanticColors['border-outline-focused']}`,
} as const satisfies Record<string, CSSProperties['boxShadow']>
