import Markdoc from '@markdoc/markdoc'

export const htmlTag = {
  attributes: {
    name: { type: String, required: true },
    attrs: { type: Object },
  },
  transform(node, config) {
    const { name, attrs } = node.attributes
    const children = node.transformChildren(config)

    return new Markdoc.Tag(name, attrs, children)
  },
}
