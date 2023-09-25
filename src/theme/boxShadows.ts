import chroma from 'chroma-js'
import { type CSSProperties } from 'react'

import { borderWidths } from './borders'

import { semanticColorCssVars } from './colors'
import { semanticColorsDark } from './colors-semantic-dark'
import { semanticColorsLight } from './colors-semantic-light'

const shadowL = chroma(semanticColorsLight['shadow-default'])
const shadowLPurple = chroma(semanticColorsLight['shadow-purple'])
const shadowD = chroma(semanticColorsDark['shadow-default'])

export const getBoxShadows = ({ mode }: { mode: 'dark' | 'light' }) =>
  ({
    ...(mode === 'dark'
      ? {
          slight: [
            `0px 2px 7px 0px ${shadowD.alpha(0.18)}`,
            `0px 2px 4px 0px ${shadowD.alpha(0.14)}`,
          ].join(','),
          moderate: [
            `0px 10px 20px 0px ${shadowD.alpha(0.3)}`,
            `0px 3px 6px 0px ${shadowD.alpha(0.2)}`,
          ].join(','),
          modal: `0px 20px 50px 0px ${shadowD.alpha(0.6)}`,
          slightPurple: '',
          moderatePurple: '',
          modalPurple: '',
        }
      : {
          slight: [
            `0px 2px 10px 0px ${shadowL.alpha(0.04)}`,
            `0px 1px 3px 0px ${shadowL.alpha(0.04)}`,
          ].join(','),
          moderate: [
            `0px 2px 10px 0px ${shadowL.alpha(0.08)}`,
            `0px 2px 7px 1px ${shadowL.alpha(0.1)}`,
          ].join(','),
          modal: `0px 10px 40px 0px ${shadowL.alpha(0.25)}`,
          slightPurple: [
            `0px 2px 10px 0px ${shadowLPurple.alpha(0.04)}`,
            `0px 1px 3px 0px ${shadowLPurple.alpha(0.04)}`,
          ].join(','),
          moderatePurple: [
            `0px 2px 10px 0px ${shadowLPurple.alpha(0.08)}`,
            `0px 2px 7px 1px ${shadowLPurple.alpha(0.1)}`,
          ].join(','),
          modalPurple: `0px 10px 40px 0px ${shadowLPurple.alpha(0.25)}`,
        }),
    // Deprecated in favor of focus outlines
    focused: `0px 0px 0px ${borderWidths.focus}px ${semanticColorCssVars['border-outline-focused']}`,
  }) as const satisfies Record<string, CSSProperties['boxShadow']>
