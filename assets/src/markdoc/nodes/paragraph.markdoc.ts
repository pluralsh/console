import { Tag } from '@markdoc/markdoc'

import Paragraph from '../components/Paragraph'

function containsImage(children: { name: string }[]) {
  for (const c of children) {
    if (c?.name === 'Image') return true
  }

  return false
}

export const paragraph = {
  render: Paragraph,
  children: ['inline'],
  transform(node, config) {
    const children = node.transformChildren(config)

    // Unwrap images from paragraphs to avoid react rehydration errors
    // Since <figures> aren't "supposed" to be in <p> tags
    if (containsImage(children)) {
      const newChildren: any[] = []
      let childAcc: any[] = []

      for (const c of children) {
        if (c?.name === 'Image' || c?.name === 'Paragraph') {
          if (childAcc.length > 0) {
            newChildren.push(new Tag('Paragraph', {}, childAcc))
            childAcc = []
          }
          newChildren.push(c)
        } else if (!(typeof c === 'string' && !c.trim())) {
          childAcc.push(c)
        }
      }
      if (childAcc.length > 0) {
        newChildren.push(new Tag('Paragraph', {}, childAcc))
      }

      return newChildren
    }

    return new Tag(this.render as any, {}, children)
  },
}
