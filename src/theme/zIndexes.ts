import { CSSObject } from 'styled-components'

export const zIndexes = {
  base: 0,
  selectPopover: 500,
  modal: 1000,
  tooltip: 2000,
} as const satisfies CSSObject
