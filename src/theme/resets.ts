import { CSSObject } from 'styled-components'

export const resetPartials = {
  button: {
    textAlign: 'inherit',
    background: 'none',
    color: 'inherit',
    border: 'none',
    padding: 0,
    font: 'inherit',
    cursor: 'pointer',
    outline: 'inherit',
  },
} as const satisfies Record<string, CSSObject>
