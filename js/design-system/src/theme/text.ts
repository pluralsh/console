import { type CSSObject } from '../types'

import { fontFamilies } from './fonts'
import { semanticColorCssVars } from './colors'
import { pxToRem } from './rem'

export const INLINE_CODE_EMS = 0.8
export const INLINE_CODE_MIN_PX = 12

const bodyBaseStyle = {
  fontFamily: fontFamilies.sans,
  fontWeight: 400,
  letterSpacing: '0.03125rem',
  '& b, & strong': {
    fontWeight: 600,
  },
} as const satisfies CSSObject

const body1 = {
  ...bodyBaseStyle,
  ...{
    fontSize: '1rem',
    lineHeight: '1.5rem',
  },
} as const satisfies CSSObject

const body2 = {
  ...bodyBaseStyle,
  ...{
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
} as const satisfies CSSObject

const bodyBold = {
  fontWeight: 600,
} as const satisfies CSSObject

const body2LooseLineHeight = {
  ...body2,
  lineHeight: '1.375rem',
} as const satisfies CSSObject

// The mono font ships with ligatures; code must render as typed.
// Spread this instead of setting fontFamilies.mono directly.
const mono = {
  fontFamily: fontFamilies.mono,
  fontVariantLigatures: 'none',
} as const satisfies CSSObject

const textPartials = {
  h1: {
    fontFamily: fontFamilies.semi,
    fontSize: '4.5rem',
    lineHeight: '110%',
    fontWeight: 400,
    letterSpacing: '-0.0625rem',
  },
  h2: {
    fontFamily: fontFamilies.semi,
    fontSize: '3.75rem',
    lineHeight: '115%',
    fontWeight: 500,
    letterSpacing: '-0.0625rem',
  },
  h3: {
    fontFamily: fontFamilies.semi,
    fontSize: '3rem',
    lineHeight: '120%',
    fontWeight: 400,
    letterSpacing: '-0.03125rem',
  },
  h4: {
    fontFamily: fontFamilies.semi,
    fontSize: '2.25rem',
    lineHeight: '2.8125rem',
    fontWeight: 400,
    letterSpacing: '-0.015625rem',
  },
  title1: {
    fontFamily: fontFamilies.semi,
    fontSize: '1.875rem',
    lineHeight: '2.5rem',
    fontWeight: 500,
    letterSpacing: '-0.015625rem',
  },
  title2: {
    fontFamily: fontFamilies.semi,
    fontSize: '1.5rem',
    lineHeight: '2rem',
    fontWeight: 500,
    letterSpacing: '-0.015625rem',
  },
  subtitle1: {
    fontFamily: fontFamilies.semi,
    fontSize: '1.25rem',
    lineHeight: '1.5rem',
    fontWeight: 500,
    letterSpacing: 0,
  },
  subtitle2: {
    fontFamily: fontFamilies.semi,
    fontSize: '1.125rem',
    lineHeight: '1.5rem',
    fontWeight: 500,
    letterSpacing: 0,
  },
  body1,
  body2,
  bodyBold,
  body1Bold: { ...body1, ...bodyBold },
  body2Bold: { ...body2, ...bodyBold },
  body2LooseLineHeight,
  body2LooseLineHeightBold: {
    ...body2LooseLineHeight,
    ...bodyBold,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: 400,
    letterSpacing: '0.03125rem',
  },
  badgeLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.75rem',
    lineHeight: '100%',
    fontWeight: 700,
    letterSpacing: '0.03125rem',
  },
  buttonMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
    fontWeight: 600,
    letterSpacing: '0.03125rem',
  },
  buttonLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: '1rem',
    lineHeight: '1.5rem',
    fontWeight: 600,
    letterSpacing: '0.03125rem',
  },
  buttonSmall: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.75rem',
    lineHeight: '1.5rem',
    fontWeight: 600,
    letterSpacing: '0.03125rem',
  },
  overline: {
    fontFamily: fontFamilies.semi,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: 400,
    letterSpacing: '0.078125rem',
    textTransform: 'uppercase',
  },
  truncate: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  inlineLink: {
    // Must declare all intermediate color variables at style root due to
    // security restritions on setting properties for :visited pseudo-class
    '--inline-link-c': semanticColorCssVars['action-link-inline'],
    '--inline-link-c-h': semanticColorCssVars['action-link-inline-hover'],
    '--inline-link-c-v': semanticColorCssVars['action-link-inline-visited'],
    '--inline-link-c-v-h':
      semanticColorCssVars['action-link-inline-visited-hover'],
    color: `var(--inline-link-c)`,
    textDecoration: 'underline',
    '&:hover': {
      color: 'var(--inline-link-c-h)',
    },
    '&:visited, &:active': {
      color: 'var(--inline-link-c-v)',
      '&:hover': {
        color: 'var(--inline-link-c-v-h)',
      },
    },
  },
  mono,
  code: {
    ...mono,
    fontSize: '0.875rem',
    lineHeight: '1.375rem',
    letterSpacing: '0.015625rem',
  },
  inlineCode: {
    ...mono,
    fontSize: `calc(max(${pxToRem(INLINE_CODE_MIN_PX)}, ${INLINE_CODE_EMS}em))`,
    letterSpacing: '0.015625rem',
  },
} as const satisfies Record<string, CSSObject>

export { textPartials }
