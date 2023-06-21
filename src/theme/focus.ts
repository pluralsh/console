import { type CSSObject } from '../types'

import { type ColorMode } from '../theme'

import { getBoxShadows } from './boxShadows'

import { borderWidths } from './borders'
import { semanticColorCssVars } from './colors'

export const getFocusPartials = ({ mode }: { mode: ColorMode }) => {
  const boxShadows = getBoxShadows({ mode })

  return {
    default: {
      outline: 'none',
      boxShadow: boxShadows.focused,
    },
    outline: {
      '--outlineC': semanticColorCssVars['border-outline-focused'],
      outline: `${borderWidths.focus}px solid var(--outlineC)`,
    },
    button: {
      '--outlineC': semanticColorCssVars['border-outline-focused'],
      outline: `1px solid var(--outlineC)}`,
      outlineOffset: '-1px',
    },
    insetAbsolute: {
      outline: 'none',
      position: 'absolute',
      content: "''",
      pointerEvents: 'none',
      top: `${borderWidths.focus}px`,
      right: `${borderWidths.focus}px`,
      left: `${borderWidths.focus}px`,
      bottom: `${borderWidths.focus}px`,
      boxShadow: boxShadows.focused,
    },
  } as const satisfies Record<string, CSSObject>
}
