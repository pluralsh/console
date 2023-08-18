import { createGlobalStyle } from 'styled-components'

const GlobalStyles = createGlobalStyle(({ theme }) => ({
  ':root': {
    '--docsearch-primary-color': theme.colors['action-primary'],
    '--docsearch-text-color': 'rgb(28, 30, 33)',
    '--docsearch-spacing': `${theme.spacing.medium}px`,
    '--docsearch-icon-stroke-width': '1.4',
    '--docsearch-highlight-color': theme.colors['action-primary'],
    '--docsearch-muted-color': 'rgb(150, 159, 175)',
    '--docsearch-container-background': 'rgba(101, 108, 133, 0.8)',
    '--docsearch-logo-color': theme.colors['action-primary'],

    /* modal */
    '--docsearch-modal-width': '620px',
    '--docsearch-modal-height': '600px',
    '--docsearch-modal-background': 'rgb(245, 246, 247)',
    '--docsearch-modal-shadow': `inset 1px 1px 0 0 rgba(255, 255, 255, 0.5),
      0 3px 8px 0 rgba(85, 90, 100, 1);`,

    /* searchbox */
    '--docsearch-searchbox-height': '48px',
    '--docsearch-searchbox-background': 'rgb(235, 237, 240)',
    '--docsearch-searchbox-focus-background': '#fff',
    '--docsearch-searchbox-shadow': `inset 0 0 0 1px ${theme.colors.border}`,

    /* hit */
    '--docsearch-hit-height': `${theme.spacing.xxxlarge}px`,
    '--docsearch-hit-color': 'rgb(68, 73, 80)',
    '--docsearch-hit-active-color': '#fff',
    '--docsearch-hit-background': '#fff',
    '--docsearch-hit-shadow': '0 1px 3px 0 rgb(212, 217, 225)',

    /* key */
    '--docsearch-key-gradient': `linear-gradient(
      -225deg,
      rgb(213, 219, 228) 0%,
      rgb(248, 248, 248) 100%
    )`,
    '--docsearch-key-shadow': `inset 0 -2px 0 0 rgb(205, 205, 230),
      inset 0 0 1px 1px #fff, 0 1px 2px 1px rgba(30, 35, 90, 0.4)`,

    /* footer */
    '--docsearch-footer-height': '44px',
    '--docsearch-footer-background': '#fff',
    '--docsearch-footer-shadow': `0 -1px 0 0 rgb(224, 227, 232),
      0 -3px 6px 0 rgba(69, 98, 155, 0.12)`,
  },

  /* Darkmode */

  ':root ': {
    '--docsearch-text-color': theme.colors.text,
    '--docsearch-container-background': 'rgba(23, 26, 33, 0.6)',
    '--docsearch-modal-background': theme.colors['fill-one'],
    '--docsearch-modal-shadow': 'none',
    '--docsearch-searchbox-background': 'rgb(9, 10, 17)',
    '--docsearch-searchbox-focus-background': '#000',
    '--docsearch-hit-color': 'rgb(190, 195, 201)',
    '--docsearch-hit-shadow': 'none',
    '--docsearch-hit-background': 'rgb(9, 10, 17)',
    '--docsearch-key-gradient': 'none',
    '--docsearch-key-shadow': 'none',
    '--docsearch-footer-background': theme.colors['fill-one'],
    '--docsearch-footer-shadow': 'none',
    '--docsearch-logo-color': theme.colors['text-xlight'],
    '--docsearch-muted-color': theme.colors['text-xlight'],
  },

  /* Overrides */
  '.DocSearch': {
    ...theme.partials.text.body2,
  },
  '.DocSearch-Button-Keys, .DocSearch-Commands, .DocSearch-Button-Placeholder':
    {
      display: 'none',
    },

  '.DocSearch-Form:focus-within': {
    boxShadow: theme.boxShadows.focused,
  },
  '.DocSearch-Hit-source': {
    ...theme.partials.text.subtitle2,
    color: theme.colors.text,
    background: 'transparent',
    marginBottom: theme.spacing.xsmall,
    marginTop: theme.spacing.xxsmall,
  },
  '.DocSearch-MagnifierLabel': {
    color: theme.colors.text,
    width: 16,
    height: 16,
  },
  '.DocSearch-Hit-content-wrapper': {
    marginLeft: theme.spacing.medium,
  },
  '.DocSearch-Hit-title': {
    ...theme.partials.text.body1Bold,
    color: theme.colors['text-light'],
  },
  '.DocSearch-Hit-path': {
    ...theme.partials.text.body2,
    color: theme.colors['text-xlight'],
  },
  '.DocSearch-Modal': {
    border: theme.borders['fill-one'],
  },
  '.DocSearch-Form': {
    paddingLeft: theme.spacing.medium,
    paddingRight: theme.spacing.medium,
  },
  '.DocSearch-Input': {
    ...theme.partials.text.body1,
    paddingLeft: theme.spacing.small,
  },
  '.DocSearch-Button': {
    borderRadius: theme.borderRadiuses.medium,
    border: theme.borders.input,
    margin: 0,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: theme.colors['fill-zero-hover'],
      outline: 'none',
      boxShadow: 'none',
    },
    '&:focus, &:focus-visible': {
      outline: 'none',
      boxShadow: 'none',
      backgroundColor: 'transparent',
    },
    '&:focus-visible': {
      ...theme.partials.focus.default,
    },
  },
  '.DocSearch-Container': {
    zIndex: theme.zIndexes.modal,
  },
  '.DocSearch-Button-Container, .DocSearch-MagnifierLabel': {
    display: 'block',
    width: 16,
    height: 16,
    backgroundImage: 'url(/search-icon.svg)',
    backgroundSize: 'contain',
  },
  '.DocSearch-Search-Icon': {
    display: 'none',
  },
}))

export default GlobalStyles
