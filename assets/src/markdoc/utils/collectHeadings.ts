import { RenderableTreeNode } from '@markdoc/markdoc'

export type MarkdocHeading = {
  id?: string
  level?: number
  title?: string
}

type ContentType = RenderableTreeNode & {
  name?: unknown
  attributes?: unknown
  children?: unknown
}

export default function collectHeadings(content: RenderableTreeNode,
  headings: MarkdocHeading[] = []) {
  const c = content as ContentType

  if (c) {
    if (c?.name === 'Heading') {
      const title = c.children?.[0]

      if (typeof title === 'string') {
        headings.push({
          ...(typeof c.attributes === 'object' ? c.attributes : {}),
          title,
        })
      }
    }

    if (Array.isArray(c?.children)) {
      for (const child of c.children) {
        if (child) {
          collectHeadings(child, headings)
        }
      }
    }
  }

  return headings as MarkdocHeading[]
}
