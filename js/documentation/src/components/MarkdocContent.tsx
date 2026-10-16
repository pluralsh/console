import React, { useEffect, useRef, useState } from 'react'

import { type RenderableTreeNodes, renderers, type Tag } from '@markdoc/markdoc'
import { produce } from 'immer'

import { components, type MarkdocPage } from '../markdoc/mdSchema'

const INITIAL_CHUNK_SIZE = 10
const CHUNK_SIZE = 100

export default function MarkdocComponent({
  markdoc,
}: {
  markdoc: MarkdocPage
}) {
  const { children = [], ...rest } = (markdoc?.content ?? {}) as any

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

  // render the remaining in bigger chunks, one per frame, after the initial render
  useEffect(() => {
    if (isFullyLoaded) return

    const frame = requestAnimationFrame(() =>
      setContent((content) =>
        produce(content, (d: Tag) => {
          d.children.push(
            ...children.slice(d.children.length, d.children.length + CHUNK_SIZE)
          )
        })
      )
    )

    return () => cancelAnimationFrame(frame)
  }, [children, isFullyLoaded, numRendered])

  // scroll to element with matching ID once it loads
  useEffect(() => {
    const element = hashRef.current && document.getElementById(hashRef.current)

    if (element) {
      element.scrollIntoView()
      hashRef.current = false
    }
  }, [numRendered])

  return renderMarkdoc(content)
}

const renderMarkdoc = (markdoc: RenderableTreeNodes) => {
  const renderedNode = renderers.react(markdoc, React, {
    components,
  })

  return renderedNode
}
