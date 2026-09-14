import { createGlobalStyle } from 'styled-components'

import { mqs } from './Breakpoints'

const fillAvailable = (prop) => ({
  [`${prop} `]: '-webkit-fill-available',
  [`${prop}  `]: '-moz-available',
  [`${prop}   `]: '-fill-available',
})

const GlobalStyles = createGlobalStyle(({ theme }) => ({
  '::selection': {
    background: theme.colors['text-primary-accent'],
    color: theme.colors['fill-one'],
  },
  '*:focus': {
    outline: 'none',
  },
  'a:focus-visible': {
    ...theme.partials.focus.default,
  },
  ':root': {
    '--top-nav-height': '72px',
    '--menu-extra-bpad': '0px',
    '--docs-sidenav-width': '306px',
    '--docs-sidecar-width': '220px',
  },
  'a:any-link': {
    color: 'unset',
    textDecoration: 'unset',
  },
  '.primary-content table td': {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  html: {
    ...fillAvailable('height'),
  },
  body: {
    margin: 0,
    overflowX: 'clip',
    color: theme.colors.text,
    backgroundColor: theme.colors['fill-zero'],
    ...fillAvailable('minHeight'),
  },
  '*': {
    scrollPaddingTop: 'var(--top-nav-height)',
    scrollMarginTop: `${theme.spacing.large}px`,
  },
  [mqs.twoColumn]: {
    ':root': {
      '--top-nav-height': '80px',
    },
  },
}))

export default GlobalStyles
export { fillAvailable }
