// Ripped from here:
// https://raw.githubusercontent.com/markdoc/next.js/17050b0222a4de8b2d0e3ece672a25c37104782a/src/tags.js
// Current plugin doesn't seem to support these from the package using Typescript

import Head from 'next/head'
import Script from 'next/script'

import { Link } from '@pluralsh/design-system/dist/markdoc/components'

export const comment = {
  description: 'Use to comment the content itself',
  attributes: {},
  transform() {
    return []
  },
}

export const head = {
  render: Head,
  description: 'Renders a Next.js head tag',
  attributes: {},
}

export const link = {
  render: Link,
  description: 'Displays a Next.js link',
  attributes: {
    href: {
      description: 'The path or URL to navigate to.',
      type: String,
      errorLevel: 'critical',
      required: true,
    },
    as: {
      description:
        'Optional decorator for the path that will be shown in the browser URL bar.',
      type: String,
    },
    passHref: {
      description: 'Forces Link to send the href property to its child.',
      type: Boolean,
      default: false,
    },
    prefetch: {
      description: 'Prefetch the page in the background.',
      type: Boolean,
    },
    replace: {
      description:
        'Replace the current history state instead of adding a new url into the stack.',
      type: Boolean,
      default: false,
    },
    scroll: {
      description: 'Scroll to the top of the page after a navigation.',
      type: Boolean,
      default: true,
    },
    shallow: {
      description:
        'Update the path of the current page without rerunning getStaticProps, getServerSideProps or getInitialProps.',
      type: Boolean,
      default: true,
    },
    locale: {
      description: 'The active locale is automatically prepended.',
      type: Boolean,
    },
  },
}

export const script = {
  render: Script,
  description: 'Renders a Next.js script tag',
  attributes: {
    src: {
      type: String,
      errorLevel: 'critical',
      required: true,
    },
    strategy: {
      type: String,
      matches: ['beforeInteractive', 'afterInteractive', 'lazyOnload'],
    },
  },
}
