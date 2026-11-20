import { CSSProperties } from 'react'

export const TRUNCATE = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} satisfies CSSProperties

// rtl makes the ellipsis land on the left, but it also makes the bidi algorithm
// move leading/trailing punctuation to the wrong end ("_tmp.json" -> "tmp.json_").
// the zero-width LRM marks pin those characters back in left-to-right order
export const TRUNCATE_LEFT = {
  ...TRUNCATE,
  direction: 'rtl',
  textAlign: 'left',
  '&::before, &::after': { content: '"\\200E"' },
} as const
