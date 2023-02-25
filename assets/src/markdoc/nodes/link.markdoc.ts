// import { link as baseLink } from '@markdoc/next.js/tags'

import Link from '../components/Link'

export const link = {
  render: Link,
  attributes: {
    href: { type: String },
  },
}
