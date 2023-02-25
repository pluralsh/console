import { Tag } from '@markdoc/markdoc'

import Button, { ButtonGroup } from '../components/Button'
import unwrapParagraphs from '../utils/unwrapParagraphs'

export const button = {
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

    return new Tag(this.render as any, attributes, children)
  },
}

export const buttonGroup = {
  render: ButtonGroup,
  description: 'Display a horizontal list of buttons',
  children: ['Button'],
  attributes: {},
  transform(node, config) {
    const children = unwrapParagraphs(node.transformChildren(config)).filter(child => child?.name === 'Button')
    const attributes = node.transformAttributes(config)

    return new Tag(this.render as any, attributes, children)
  },
}
