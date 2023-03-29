import React from 'react'

import { RenderableTreeNode, renderers } from '@markdoc/markdoc'

import { components } from 'markdoc/mdSchema'

import { getMdContent } from '../../../../markdoc/utils/getMdContent'

export default function MarkdocComponent({
  raw,
  content,
  components: userComponents = {},
}: {
  raw?: string | null
  content?: RenderableTreeNode
  components?: any
}) {
  content = content || getMdContent(raw)

  if (!content) {
    return null
  }

  const node = renderers.react(content, React, {
    components: {
      ...components,
      // Allows users to override default components
      ...userComponents,
    },
  })

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{node}</>
}
