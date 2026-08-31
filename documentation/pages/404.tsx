import Link from '@pluralsh/design-system/dist/markdoc/components/Link'

import { ContentHeader } from '@src/components/MainContent'

export default function Docs404() {
  return (
    <ContentHeader
      title="Page not found"
      description={
        <>
          Sorry, this page doesn't appear to exist. Would you like to vist the{' '}
          <Link href="/">home page</Link>?{' '}
        </>
      }
    />
  )
}
