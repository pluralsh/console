import { collectHeadings, getMdContent } from '@pluralsh/design-system'

import { FileContent } from 'generated/graphql'

import { config } from 'markdoc/mdSchema'

export function getDocsData(
  docs:
    | (Pick<FileContent, 'content' | 'path'> | null | undefined)[]
    | null
    | undefined
) {
  return docs?.map((doc, i) => {
    const content = getMdContent(doc?.content, config)
    const headings = collectHeadings(content)
    const id = headings?.[0]?.id || `page-${i}`
    const label = headings?.[0]?.title || `Page ${i}`
    const path = `docs/${id}`

    const subpaths = headings
      .map((heading) => {
        if (heading.level === 3 && heading.id && heading.title) {
          return {
            path: `${path}#${heading.id}`,
            label: `${heading.title}`,
            id: heading.id,
            type: 'docPageHash',
          }
        }

        return null
      })
      .filter((heading) => !!heading)

    return {
      path,
      id,
      label,
      subpaths,
      content,
      headings,
      type: 'docPage',
    }
  })
}
