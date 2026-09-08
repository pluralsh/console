import React, { useEffect, useRef, useState } from 'react'

import { type RenderableTreeNodes, type Tag, renderers } from '@markdoc/markdoc'
import { produce } from 'immer'

import { type MarkdocPage, components } from '../markdoc/mdSchema'

const INITIAL_CHUNK_SIZE = 10
const CHUNK_SIZE = 100

export default function MarkdocComponent({
  markdoc,
}: {
  markdoc: MarkdocPage
}) {
  const { children = [], ...rest } = markdoc?.content as any

  // render a smaller visible chunk right away
  const [content, setContent] = useState<Tag>(() => ({
    ...rest,
    children: children.slice(0, INITIAL_CHUNK_SIZE),
  }))
  const numRendered = content.children.length
  const isFullyLoaded = numRendered >= children.length

  // store the hash from URL (without the # character), we can't navigate to it until the content is fully loaded
  const hashRef = useRef<string | false>(
    typeof window !== 'undefined' &&
      !isFullyLoaded &&
      window.location.hash.slice(1)
  )

  // render the remaining in  bigger chunks after the initial render
  useEffect(() => {
    const element = hashRef.current && document.getElementById(hashRef.current)

    if (!isFullyLoaded)
      setContent(
        produce(content, (d: Tag) => {
          d.children.push(
            ...children.slice(numRendered, numRendered + CHUNK_SIZE)
          )
        })
      )
    // scroll to element with matching ID once it loads
    if (element) {
      element.scrollIntoView()
      hashRef.current = false
    }
  }, [children, content, isFullyLoaded, markdoc, numRendered])

  return renderMarkdoc(content)
}

const renderMarkdoc = (markdoc: RenderableTreeNodes) => {
  const renderedNode = renderers.react(markdoc, React, {
    components,
  })

  return renderedNode
}
