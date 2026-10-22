import { type CSSObject } from '../types'

import { fontFamilies } from './fonts'
import { semanticColorCssVars } from './colors'
import { TRACKING } from './rem'

const body1 = {
  fontFamily: fontFamilies.sans,
  fontSize: '1.125rem',
  lineHeight: '140%',
  fontWeight: 300,
  letterSpacing: TRACKING.wide,
  color: semanticColorCssVars['text-xlight'],
} as const satisfies CSSObject

const body2 = {
  fontFamily: fontFamilies.sans,
  fontSize: '1rem',
  lineHeight: '160%',
  fontWeight: 300,
  letterSpacing: TRACKING.wide,
  color: semanticColorCssVars['text-xlight'],
} as const satisfies CSSObject

const bodyBold = {
  fontWeight: 700,
  color: semanticColorCssVars['text-light'],
} as const satisfies CSSObject

const marketingTextPartials = {
  bigHeader: {
    fontFamily: fontFamilies.sansHero,
    fontSize: '3.75rem',
    lineHeight: '120%',
    fontWeight: 500,
    letterSpacing: TRACKING.normal,
    color: semanticColorCssVars.text,
  },
  hero1: {
    fontFamily: fontFamilies.sansHero,
    fontSize: '3rem',
    lineHeight: '120%',
    fontWeight: 700,
    letterSpacing: TRACKING.normal,
    color: semanticColorCssVars.text,
  },
  hero2: {
    fontFamily: fontFamilies.sansHero,
    fontSize: '2.25rem',
    lineHeight: '125%',
    fontWeight: 500,
    letterSpacing: TRACKING.normal,
    color: semanticColorCssVars.text,
  },
  title1: {
    fontFamily: fontFamilies.sansHero,
    fontSize: '1.875rem',
    lineHeight: '140%',
    fontWeight: 500,
    letterSpacing: TRACKING.normal,
    color: semanticColorCssVars.text,
  },
  title2: {
    fontFamily: fontFamilies.sansHero,
    fontSize: '1.5rem',
    lineHeight: '140%',
    fontWeight: 500,
    letterSpacing: TRACKING.normal,
    color: semanticColorCssVars.text,
  },
  subtitle1: {
    fontFamily: fontFamilies.sans,
    fontSize: '1.5rem',
    lineHeight: '140%',
    fontWeight: 600,
    letterSpacing: TRACKING.normal,
    color: semanticColorCssVars.text,
  },
  subtitle2: {
    fontFamily: fontFamilies.sans,
    fontSize: '1.125rem',
    lineHeight: '150%',
    fontWeight: 600,
    letterSpacing: TRACKING.wide,
    color: semanticColorCssVars.text,
  },
  body1,
  body2,
  bodyBold,
  body1Bold: {
    ...body1,
    ...bodyBold,
  },
  body2Bold: {
    ...body2,
    ...bodyBold,
  },
  inlineLink: {
    color: semanticColorCssVars['action-link-inline'],
    textDecoration: 'underline',
    '&:hover': {
      color: semanticColorCssVars['action-link-inline-hover'],
    },
    '&:visited, &:active': {
      color: semanticColorCssVars['action-link-inline-visited'],
      '&:hover': {
        color: semanticColorCssVars['action-link-inline-visited-hover'],
      },
    },
  },
  navLink: {
    fontFamily: fontFamilies.sans,
    fontSize: '1rem',
    lineHeight: '150%',
    fontWeight: '300',
    letterSpacing: TRACKING.wide,
    color: semanticColorCssVars['text-light'],
    '&:hover': {
      color: semanticColorCssVars.text,
      textDecoration: 'underline',
    },
  },
  standaloneLink: {
    fontFamily: fontFamilies.sansHero,
    fontSize: '1rem',
    lineHeight: '150%',
    fontWeight: 500,
    letterSpacing: TRACKING.wide,
    color: semanticColorCssVars.text,
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  componentText: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.875rem',
    lineHeight: '150%',
    fontWeight: 300,
    letterSpacing: TRACKING.wide,
    color: semanticColorCssVars['text-xlight'],
  },
  componentLink: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.875rem',
    lineHeight: '150%',
    fontWeight: 600,
    letterSpacing: TRACKING.wide,
    color: semanticColorCssVars['text-light'],
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  componentLinkSmall: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.75rem',
    lineHeight: '150%',
    fontWeight: 400,
    letterSpacing: TRACKING.wide,
    color: semanticColorCssVars['text-light'],
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: '0.75rem',
    lineHeight: '150%',
    fontWeight: 300,
    letterSpacing: TRACKING.widest,
    color: semanticColorCssVars['text-xlight'],
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, CSSObject>

export { marketingTextPartials }
