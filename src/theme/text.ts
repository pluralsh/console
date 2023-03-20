import { CSSObject } from 'styled-components'

import { fontFamilies } from './fonts'
import { semanticColors } from './colors'

export const INLINE_CODE_EMS = 0.8
export const INLINE_CODE_MIN_PX = 12

const bodyBaseStyle = {
  fontFamily: fontFamilies.sans,
  fontWeight: 400,
  letterSpacing: '0.5px',
  '& b, & strong': {
    fontWeight: 600,
  },
} as const satisfies CSSObject

const body1 = {
  ...bodyBaseStyle,
  ...{
    fontSize: 16,
    lineHeight: '24px',
  },
} as const satisfies CSSObject

const body2 = {
  ...bodyBaseStyle,
  ...{
    fontSize: 14,
    lineHeight: '20px',
  },
} as const satisfies CSSObject

const bodyBold = {
  fontWeight: 600,
} as const satisfies CSSObject

const body2LooseLineHeight
  = {
    ...body2,
    lineHeight: '22px',
  } as const satisfies CSSObject

const textPartials = {
  h1: {
    fontFamily: fontFamilies.semi,
    fontSize: 72,
    lineHeight: '110%',
    fontWeight: 400,
    letterSpacing: '-1px',
  },
  h2: {
    fontFamily: fontFamilies.semi,
    fontSize: 60,
    lineHeight: '115%',
    fontWeight: 500,
    letterSpacing: '-1px',
  },
  h3: {
    fontFamily: fontFamilies.semi,
    fontSize: 48,
    lineHeight: '120%',
    fontWeight: 400,
    letterSpacing: '-0.5px',
  },
  h4: {
    fontFamily: fontFamilies.semi,
    fontSize: 36,
    lineHeight: '45px',
    fontWeight: 400,
    letterSpacing: '-0.25px',
  },
  title1: {
    fontFamily: fontFamilies.semi,
    fontSize: 30,
    lineHeight: '40px',
    fontWeight: 500,
    letterSpacing: '-0.25px',
  },
  title2: {
    fontFamily: fontFamilies.semi,
    fontSize: 24,
    lineHeight: '32px',
    fontWeight: 500,
    letterSpacing: '-0.25px',
  },
  subtitle1: {
    fontFamily: fontFamilies.semi,
    fontSize: 20,
    lineHeight: '24px',
    fontWeight: 500,
    letterSpacing: 0,
  },
  subtitle2: {
    fontFamily: fontFamilies.semi,
    fontSize: 18,
    lineHeight: '24px',
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
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 400,
    letterSpacing: '0.5px',
  },
  badgeLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: '100%',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  buttonMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: '24px',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  buttonLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: '24px',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  buttonSmall: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: '24px',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  overline: {
    fontFamily: fontFamilies.semi,
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 400,
    letterSpacing: '1.25px',
    textTransform: 'uppercase',
  },
  truncate: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  inlineLink: {
    color: semanticColors['action-link-inline'],
    textDecoration: 'underline',
    '&:hover': {
      color: semanticColors['action-link-inline-hover'],
    },
    '&:visited, &:active': {
      color: semanticColors['action-link-inline-visited'],
      '&:hover': {
        color: semanticColors['action-link-inline-visited-hover'],
      },
    },
  },
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: 14,
    lineHeight: '22px',
    letterSpacing: '.25px',
  },
  inlineCode: {
    fontFamily: fontFamilies.mono,
    fontSize: `calc(max(${INLINE_CODE_MIN_PX}px, ${INLINE_CODE_EMS}em))`,
    letterSpacing: '.25px',
  },
} as const satisfies Record<string, CSSObject>

export { textPartials }
