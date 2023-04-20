import { Tag } from '@markdoc/markdoc'

import Button, { ButtonGroup } from '../components/Button'
import unwrapParagraphs from '../utils/unwrapParagraphs'

import { type BaseSchema } from '../types'

export const button: BaseSchema = {
  render: Button,
  description: 'Display a button link',
  children: ['inline'],
  attributes: {
    type: {
      type: String,
      description: 'Only one (default) option right now: "floating"',
    },
    href: {
      type: String,
      description: 'Link for button',
    },
    icon: {
      type: String,
      description: 'Name of icon',
    },
  },
  transform(node, config) {
    const children = unwrapParagraphs(node.transformChildren(config))
    const attributes = node.transformAttributes(config)

    return new Tag(this.render, attributes, children)
  },
}

export const buttonGroup: BaseSchema = {
  render: ButtonGroup,
  description: 'Display a horizontal list of buttons',
  children: ['Button'],
  attributes: {},
  transform(node, config) {
    const children = unwrapParagraphs(node.transformChildren(config)).filter(
      (child) => (child as Tag)?.name === 'Button'
    )
    const attributes = node.transformAttributes(config)

    return new Tag(this.render, attributes, children)
  },
}
