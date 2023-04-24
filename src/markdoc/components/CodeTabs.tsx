import { useMemo } from 'react'
import { type RenderableTreeNode } from '@markdoc/markdoc'

import { FenceInner, toCodeString } from './Fence'

type CodeTabsTab = {
  content: string
  language?: string
  process: boolean
  showHeader?: boolean
  title?: string
  children?: RenderableTreeNode[] | RenderableTreeNode
}

function CodeTabs({
  tabs,
  ...props
}: {
  tabs: (CodeTabsTab | null | undefined)[]
}) {
  const codeTabs = useMemo(
    () =>
      tabs
        .filter(
          (tab: CodeTabsTab | null | undefined): tab is CodeTabsTab => !!tab
        )
        .map((tab) => {
          const { content, children, process, ...props } = tab

          return {
            ...props,
            key: props?.title || props?.language || '',
            label: props?.title || props?.language || '',
            content: toCodeString({ process, children, content }),
          }
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
