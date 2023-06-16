import chroma from 'chroma-js'
import { type CSSProperties } from 'react'

import { borderWidths } from './borders'

import { semanticColorCssVars } from './colors'
import { semanticColorsDark as cDark } from './colors-semantic-dark'
import { semanticColorsLight as cLight } from './colors-semantic-light'

export const getBoxShadows = ({ mode }: { mode: 'dark' | 'light' }) =>
  ({
    ...(mode === 'dark'
      ? {
          slight: `0px 2px 4px ${chroma(cDark['shadow-default']).alpha(
            0.14
          )}, 0px 2px 7px ${chroma(cDark['shadow-default']).alpha(0.18)}`,
          moderate: `0px 3px 6px ${chroma(cDark['shadow-default']).alpha(
            0.2
          )}, 0px 10px 20px ${chroma(cDark['shadow-default']).alpha(0.3)}`,
          modal: `0px 20px 50px ${chroma(cDark['shadow-default']).alpha(0.6)}`,
        }
      : {
          slight: `0px 2px 4px ${chroma(cLight['shadow-default']).alpha(
            0.14
          )}, 0px 2px 7px ${chroma(cLight['shadow-default']).alpha(0.18)}`,
          moderate: `0px 3px 6px ${chroma(cLight['shadow-default']).alpha(
            0.2
          )}, 0px 10px 20px ${chroma(cLight['shadow-default']).alpha(0.3)}`,
          modal: `0px 20px 50px ${chroma(cLight['shadow-default']).alpha(0.6)}`,
        }),
    focused: `0px 0px 0px ${borderWidths.focus}px ${semanticColorCssVars['border-outline-focused']}`,
  } as const satisfies Record<string, CSSProperties['boxShadow']>)
