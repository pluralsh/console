import { type RenderableTreeNode, renderers } from '@markdoc/markdoc'

import { getMdContent } from '@pluralsh/design-system'
import { components, config } from 'markdoc/mdSchema'
import React from 'react'

export default function MarkdocComponent({
  raw,
  content,
  components: userComponents = {},
}: {
  raw?: string | null
  content?: RenderableTreeNode
  components?: any
}) {
  content = content || getMdContent(raw, config)
  if (!content) {
    return null
  }

  // @ts-ignore, React version mismatch but just a TS issue
  const node = renderers.react(content, React, {
    components: {
      ...components,
      // Allows users to override default components
      ...userComponents,
    },
  })

  return <>{node}</>
}
