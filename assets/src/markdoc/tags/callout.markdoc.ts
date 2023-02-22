import { Tag } from '@markdoc/markdoc'

import Callout from '../../components/md/Callout'

export const callout = {
  render: Callout,
  description: 'Display the enclosed content in a callout box',
  children: ['paragraph', 'tag', 'list', 'cta'],
  attributes: {
    severity: {
      type: String,
      description: '"info", "warning", "success", or "danger"',
    },
    size: {
      type: String,
      description: '"full" or "compact"',
    },
    title: {
      type: String,
      description: 'The title displayed at the top of the callout',
    },
  },
  transform(node, config) {
    const children = node.transformChildren(config)
    const attributes = node.transformAttributes(config)

    const finalChildren = children.filter(child => child?.name !== 'Cta')
    const ctas = children
      .filter(child => child?.name === 'Cta')
      .map(cta => ({
        title: cta?.attributes?.title,
        href: cta?.attributes?.href,
      }))

    return new Tag(this.render as any, { ctas, ...attributes }, finalChildren)
  },
}

export const cta = {
  render: 'Cta',
  description: 'Button rendered as a child of a Callout',
  attributes: {
    title: {
      type: String,
      description: 'The title displayed in the CTA button',
    },
    href: {
      type: String,
      description: 'The url the CTA button links to',
    },
    newTab: {
      type: Boolean,
      description: 'Should open in a new tab (default true)',
    },
  },
}
