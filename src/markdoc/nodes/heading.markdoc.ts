import { Tag } from '@markdoc/markdoc'

import { Heading } from '../components/Heading'
import { toHtmlId } from '../utils/text'
import { type BaseSchema } from '../types'

function generateID(
  children: any[],
  attributes: { id?: unknown } = {}
): string {
  if (attributes?.id && typeof attributes?.id === 'string') {
    return attributes.id
  }

  return toHtmlId(
    children
      .map((child) =>
        typeof child === 'string'
          ? child
          : Array.isArray(child?.children)
          ? generateID(child.children)
          : ''
      )
      .join(' ')
  )
}

export const heading: BaseSchema = {
  render: Heading,
  children: ['inline'],
  attributes: {
    id: { type: String },
    level: { type: Number, required: true, default: 1 },
    className: { type: String },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config)
    const children = node.transformChildren(config)
    const id = generateID(children, attributes)

    return new Tag(this.render as any, { ...attributes, id }, children)
  },
}
