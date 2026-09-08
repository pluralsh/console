import { type RenderableTreeNode } from '@markdoc/markdoc'

import { isTag } from '../types'

const unwrapParagraph = (child: RenderableTreeNode) => {
  if (isTag(child) && child?.name === 'Paragraph') {
    return child?.children
  }

  return child
}

const unwrapParagraphs = (
  children: RenderableTreeNode[]
): RenderableTreeNode[] => {
  if (!Array.isArray(children)) {
    return unwrapParagraph(children) as RenderableTreeNode[]
  }

  return children.map(unwrapParagraph).flat()
}

export default unwrapParagraphs
