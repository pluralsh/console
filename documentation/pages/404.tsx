import { markdocComponents } from '@pluralsh/design-system'

import { ContentHeader } from '@src/components/MainContent'

const { Link } = markdocComponents

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
