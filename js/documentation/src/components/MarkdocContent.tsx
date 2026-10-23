import React, { useMemo } from 'react'

import { renderers } from '@markdoc/markdoc'

import { components, type MarkdocPage } from '../markdoc/mdSchema'

export default function MarkdocComponent({
  markdoc,
}: {
  markdoc: MarkdocPage
}) {
  return useMemo(
    () => renderers.react(markdoc?.content ?? null, React, { components }),
    [markdoc]
  )
}
