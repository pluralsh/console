import { styledTheme } from '@pluralsh/design-system'

export const LOGIN_SIDEBAR_IMAGE = {
  src: '/login-sidebar.jpg',
  sources: [
    {
      type: 'image/avif',
      srcSet: '/login-sidebar.avif',
    },
  ],
}
export const RIGHT_CONTENT_MAX_WIDTH = 512
export const RIGHT_CONTENT_PAD = styledTheme.spacing.xxlarge
export const LOGIN_BREAKPOINT = `@media screen and (min-width: ${
  RIGHT_CONTENT_MAX_WIDTH + RIGHT_CONTENT_PAD * 2
}px)`
