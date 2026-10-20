import { createGlobalStyle } from 'styled-components'

import { brand } from '@src/theme/docsTheme'
import { brandTokens } from '@src/theme/palette'

const fillAvailable = (prop) => ({
  [`${prop} `]: '-webkit-fill-available',
  [`${prop}  `]: '-moz-available',
  [`${prop}   `]: '-fill-available',
})

// Film grain shared with the marketing site's shell (layout.css `.site-shell`).
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='2.4' intercept='-0.7'/%3E%3CfeFuncG type='linear' slope='2.4' intercept='-0.7'/%3E%3CfeFuncB type='linear' slope='2.4' intercept='-0.7'/%3E%3CfeFuncA type='linear' slope='0' intercept='1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

const GlobalStyles = createGlobalStyle(({ theme }) => ({
  '::selection': {
    background: brand['accent-tint'],
    color: brand.ink,
  },
  // Design-system hljs selection is a fixed navy with code-block-light-grey
  // text. That token is near-black in light mode, and the rule is nested under
  // the Highlight component so it beats a plain .hljs selector. Force light
  // text on the navy in both modes.
  'html .hljs ::selection, html .hljs::selection': {
    backgroundColor: '#383a62 !important',
    color: `${brandTokens.dark.ink} !important`,
  },
  '*:focus': {
    outline: 'none',
  },
  'a:focus-visible': {
    ...theme.partials.focus.default,
  },
  ':root': {
    '--top-nav-height': '60px',
    '--menu-extra-bpad': '0px',
    '--docs-sidenav-width': '272px',
    '--docs-sidecar-width': '220px',
    '--callout-tint': '7%',
    '--callout-border': '25%',
    // Translucent so fills sit on the grain like the rest of the page.
    '--table-header':
      'color-mix(in srgb, color-mix(in srgb, var(--color-accent) 35%, var(--color-ink)) 8%, transparent)',
    '--table-stripe': 'color-mix(in srgb, var(--color-ink) 4%, transparent)',
    '--table-line':
      'color-mix(in srgb, color-mix(in srgb, var(--color-accent) 35%, var(--color-ink)) 16%, transparent)',
  },
  'html[data-theme-mode="dark"]': {
    '--callout-tint': '12%',
    '--callout-border': '40%',
    '--table-header': 'color-mix(in srgb, var(--color-ink) 9%, transparent)',
    '--table-stripe': 'color-mix(in srgb, var(--color-ink) 5%, transparent)',
    '--table-line': 'color-mix(in srgb, var(--color-ink) 14%, transparent)',
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
    color: brand.ink,
    backgroundColor: brand.canvas,
    fontFamily: theme.fontFamilies.sans,
    letterSpacing: '0.01em',
    fontSynthesisWeight: 'none',
    transition: 'background-color 0.2s ease-out, color 0.2s ease-out',
    ...fillAvailable('minHeight'),
  },
  'body::before': {
    content: '""',
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    backgroundImage: GRAIN,
    backgroundSize: '200px 200px',
    opacity: 'var(--grain-opacity)',
  },
  '#__next': {
    position: 'relative',
    zIndex: 1,
  },
  'b, strong': {
    fontWeight: 500,
  },
  '*': {
    scrollPaddingTop: 'var(--top-nav-height)',
    scrollMarginTop: `${theme.spacing.large}px`,
  },
}))

export default GlobalStyles
export { fillAvailable }
