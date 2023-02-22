import { Tag } from '@markdoc/markdoc'

import { Tab, Tabs } from '../components/Tabs'

export const tabs = {
  render: Tabs,
  description: 'Display horizontal tabs in a box',
  children: ['tab'],
  attributes: {},
  transform(node, config) {
    const tabs = node
      .transformChildren(config)
      .filter(child => child?.name === 'Tab')
      .map(tab => (typeof tab === 'object' ? {
        title: tab.attributes.title,
        children: tab.children,
      } : {}))

    return new Tag(this.render as any, { tabs }, node.transformChildren(config))
  },
}

export const tab = {
  render: Tab,
  description: 'Display content in a tab',
  attributes: {
    title: {
      type: String,
      description: 'The title displayed on the tab',
    },
  },
}
