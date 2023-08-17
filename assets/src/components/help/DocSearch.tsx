import { DocSearchModal } from '@docsearch/react'
import { createPortal } from 'react-dom'

export function DocSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: any
}) {
  if (!isOpen) {
    return null
  }

  return createPortal(
    <DocSearchModal
      appId="YTTFBOBVDJ"
      indexName="plural"
      apiKey="7a4dbe4b26eb19140c283ff40ff536b5"
      placeholder="Search Plural docs"
      navigator={{
        navigate: ({ itemUrl }) => {
          const windowReference = window.open(itemUrl, '_blank', 'noopener')

          if (windowReference) {
            windowReference.focus()
          }
        },
      }}
      getMissingResultsUrl={({ query }) =>
        `https://github.com/pluralsh/documentation/issues/new?title=${query}`
      }
      initialScrollY={window.scrollY}
      initialQuery=""
      onClose={onClose}
    />,
    document.body
  )
}
