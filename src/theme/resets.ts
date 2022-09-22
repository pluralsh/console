import { CSSObject } from 'styled-components'

import { asElementTypes } from '../utils/asElementTypes'

export const resetPartials = asElementTypes<CSSObject>()({
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
})
