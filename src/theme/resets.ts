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
