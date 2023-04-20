import { type RenderableTreeNode, Tag } from '@markdoc/markdoc'

import { FigCaption, Figure } from '../components/Figure'
import unwrapParagraphs from '../utils/unwrapParagraphs'
import { type BaseSchema, isTag } from '../types'

const makeBareImage = (node: RenderableTreeNode): RenderableTreeNode => {
  if (isTag(node) && node?.name === 'Image') {
    return {
      ...node,
      attributes: {
        ...node.attributes,
        bareImage: true,
      },
    }
  }

  return node
}

export const figure: BaseSchema = {
  render: Figure,
  children: ['tab'],
  attributes: {},
  transform(node, config) {
    const children = node
      .transformChildren(config)
      .map((child) => {
        if (isTag(child) && child?.name === 'Paragraph') {
          return child.children.map(makeBareImage)
        }

        return makeBareImage(child)
      })
      .flat()

    return new Tag(this.render as any, {}, children)
  },
}

export const caption: BaseSchema = {
  render: FigCaption,
  attributes: {
    title: {
      type: String,
      description: 'The title displayed on the tab',
    },
  },
  transform(node, config) {
    const children = unwrapParagraphs(node.transformChildren(config))

    return new Tag(this.render as any, {}, children)
  },
}
