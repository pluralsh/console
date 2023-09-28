import { type CSSObject } from '../types'

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
    alignItems: 'unset',
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  li: {
    margin: 0,
    padding: 0,
  },
} as const satisfies Record<string, CSSObject>
