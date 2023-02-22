import React from 'react'

import { parse, renderers, transform } from '@markdoc/markdoc'

import { components, config } from 'markdoc/mdSchema'

export default function MarkdocComponent({
  raw,
  components: userComponents = {},
}: {
  raw?: string | null
  components?: any
}) {
  if (!raw) {
    return null
  }

  const ast = parse(raw)
  const renderable = transform(ast, config)

  const node = renderers.react(renderable, React, {
    components: {
      ...components,
      // Allows users to override default components
      ...userComponents,
    },
  })

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{node}</>
}
