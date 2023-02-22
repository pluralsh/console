import { Tag } from '@markdoc/markdoc'

import Table from '../components/Table'

export const table = {
  render: Table,
  description: 'Display horizontal tabs in a box',
  children: ['tab'],
  attributes: {},
  transform(node, config) {
    const children = node.transformChildren(config)

    const thead = children
      .find(child => child?.name.toLowerCase() === 'thead')
      .children.find(tr => tr?.name.toLowerCase() === 'tr')
      .children.filter(th => th?.name.toLowerCase() === 'th')
      .map(th => th.children)

    const tbody = children
      .find(child => child?.name.toLowerCase() === 'tbody')
      ?.children.filter(tr => tr?.name.toLowerCase() === 'tr')
      ?.map(tr => tr.children
        .filter(trChild => trChild?.name.toLowerCase() === 'td')
        .map(td => td.children))

    return new Tag(this.render as any,
      { thead, tbody, children },
      node.transformChildren(config))
  },
}
