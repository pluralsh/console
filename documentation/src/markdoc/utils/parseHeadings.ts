import { type RenderableTreeNodes, type Tag } from '@markdoc/markdoc'
import { type MarkdocHeading } from '@pluralsh/design-system/dist/markdoc/utils/collectHeadings'

export const collectHeadings = (node: RenderableTreeNodes): MarkdocHeading[] =>
  isTag(node)
    ? node.children
        .filter(isTag)
        .filter((child) => child.name === 'Heading')
        .map((heading) => ({
          ...heading.attributes,
          title: extractTextContent(heading.children),
        }))
    : []

const extractTextContent = (node: RenderableTreeNodes): string => {
  if (!node) return ''
  if (typeof node === 'string') return node

  if (Array.isArray(node)) return node.map(extractTextContent).join('')

  if (typeof node === 'object' && node.$$mdtype === 'Tag')
    return extractTextContent(node.children)

  return ''
}

const isTag = (node: RenderableTreeNodes): node is Tag =>
  !!node &&
  typeof node === 'object' &&
  !Array.isArray(node) &&
  node.$$mdtype === 'Tag'
