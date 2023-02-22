import React from 'react'

import { parse, renderers } from '@markdoc/markdoc'

import { components, config } from 'markdoc/mdSchema'

export default function MarkdocComponent({
  markdocRaw,
  components: userComponents = {},
}: {
  markdocRaw: string
  components?: any
}) {
  if (!markdocRaw) {
    return null
  }

  const ast = parse(markdocRaw)
  const renderableTree = transform(ast, config)

  const node = renderers.react(markdoc.content, React, {
    components: {
      ...components,
      // Allows users to override default components
      ...userComponents,
    },
  })

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{node}</>
}
