import styled from 'styled-components'
import { ComponentProps, Fragment, ReactNode, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const VirtualParentSC = styled.div((_) => ({
  overflowY: 'auto',
  contain: 'content',
}))

const VirtualHeightSC = styled.div((_) => ({
  width: '100%',
  position: 'relative',
}))

export function VirtualList<T>({
  data,
  loadNextPage,
  hasNextPage,
  isLoadingNextPage,
  getRowId,
  renderer,
  ...props
}: {
  loadNextPage?: () => void
  hasNextPage?: boolean
  isLoadingNextPage?: boolean
  data: (T | null | undefined)[]
  renderer: (props: { row: T }) => ReactNode
  reactVirtualOptions?: Partial<Parameters<typeof useVirtualizer>[0]>
  getRowId?: (row: T) => string
} & ComponentProps<typeof VirtualParentSC>) {
  const parentRef = useRef<HTMLElement>(null)
  const count = data.length
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 10,
  })
  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    const vItems = virtualizer.getVirtualItems()
    const lastItem = vItems[vItems.length - 1]

    if (!lastItem) {
      return
    }

    if (lastItem.index >= count - 1 && hasNextPage && !isLoadingNextPage) {
      loadNextPage?.()
    }
  }, [
    hasNextPage,
    loadNextPage,
    data.length,
    isLoadingNextPage,
    virtualizer,
    count,
  ])

  return (
    <VirtualParentSC
      className="virtualParent"
      ref={parentRef}
      {...props}
    >
      <VirtualHeightSC
        className="virtualHeight"
        style={{
          height: virtualizer.getTotalSize(),
        }}
      >
        {virtualItems.map((virtualRow) => {
          console.log('virtualRow', virtualRow)
          const isLoaderRow = virtualRow.index > data.length - 1
          const row = data[virtualRow.index]

          if (isLoaderRow) {
            return <div key="loaderRow">Loading</div>
          }
          if (!row) {
            return null
          }
          const rowKey =
            getRowId?.(row) ||
            (row as any)?.edge?.id ||
            (row as any)?.id ||
            virtualRow.index

          console.log('rowkey', rowKey)

          return <Fragment key={rowKey}>{renderer({ row })}</Fragment>
        })}
      </VirtualHeightSC>
    </VirtualParentSC>
  )
}
