import { useMemo } from 'react'
import { type RenderableTreeNode } from '@markdoc/markdoc'

import { isTag } from '../types'

import { FenceInner, toCodeString } from './Fence'

function CodeTabs({
  tabs,
  ...props
}: {
  tabs: (RenderableTreeNode & {
    content: string
    language?: string
    process: boolean
    showHeader?: boolean
    title?: string
  })[]
}) {
  const codeTabs = useMemo(
    () =>
      tabs.map((tab) => {
        if (isTag(tab)) {
          const { content, children, process, ...props } = tab

          return {
            ...props,
            key: props?.title || props?.language || '',
            label: props?.title || props?.language || '',
            content: toCodeString({ process, children, content }),
          }
        }

        return null
      }),
    [tabs]
  )

  return (
    <FenceInner
      tabs={codeTabs}
      {...props}
    />
  )
}

export { CodeTabs }
