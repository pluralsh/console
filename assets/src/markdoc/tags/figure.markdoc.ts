import { Tag } from '@markdoc/markdoc'

import { FigCaption, Figure } from '../components/Figure'
import unwrapParagraphs from '../utils/unwrapParagraphs'

const makeBareImage = (node) => {
  if (node?.name !== 'Image') {
    return node
  }

  return {
    ...node,
    attributes: {
      ...node.attributes,
      bareImage: true,
    },
  }
}

export const figure = {
  render: Figure,
  description: 'Display horizontal tabs in a box',
  children: ['tab'],
  attributes: {},
  transform(node, config) {
    const children = node
      .transformChildren(config)
      .map((child) => {
        if (child?.name === 'Paragraph') {
          return child.children.map(makeBareImage)
        }

        return makeBareImage(child)
      })
      .flat()

    return new Tag(this.render as any, {}, children)
  },
}

export const caption = {
  render: FigCaption,
  description: 'Display content in a tab',
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
