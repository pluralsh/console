import { type CSSObject } from '../types'

import { borderWidths } from './borders'
import { semanticColorCssVars } from './colors'

export const getFocusPartials = () => {
  const outline = {
    '--outline-c': semanticColorCssVars['border-outline-focused'],
    outline: `${borderWidths.focus}px solid var(--outline-c)`,
    outlineOffset: -1,
  }

  return {
    default: outline,
    outline,
    button: outline,
    insetAbsolute: {
      outline: 'none',
      position: 'absolute',
      content: "''",
      pointerEvents: 'none',
      top: 0,
      right: 0,
      left: 0,
      bottom: 0,
      ...outline,
    },
  } as const satisfies Record<string, CSSObject>
}
