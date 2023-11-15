import styled from 'styled-components'
import {
  ComponentProps,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const VirtualParentSC = styled.div((_) => ({
  overflowY: 'auto',
  contain: 'content',
}))

const VirtualListSC = styled.div((_) => ({
  width: '100%',
  position: 'relative',
}))

const VirtualItemsSC = styled.ul(({ theme }) => ({
  ...theme.partials.reset.list,
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
}))

const VirtualItemSC = styled.li<{ $isLast?: boolean; $gap: number }>(
  ({ theme, $isLast, $gap }) => ({
    ...theme.partials.reset.li,
    width: '100%',
    paddingBottom: $isLast ? undefined : $gap,
  })
)

export type VirtualListRenderer<
  T,
  M extends Record<string, any> = Record<string, unknown>,
> = (
  props: { row: T; meta: M }
  //   ref: RefCallback<any>
) => ReactNode

export function VirtualList<
  T,
  M extends Record<string, any> = Record<string, unknown>,
>({
  data: rows,
  loadNextPage,
  hasNextPage,
  isLoadingNextPage,
  getRowId,
  renderer,
  gap = 0,
  reactVirtualOptions,
  meta,
  ...props
}: {
  loadNextPage?: () => void
  hasNextPage?: boolean
  isLoadingNextPage?: boolean
  data: (T | null | undefined)[]
  renderer: VirtualListRenderer<T, M>
  reactVirtualOptions?: Partial<Parameters<typeof useVirtualizer>[0]>
  getRowId: (row: T) => string
  gap?: number
  meta: M
} & ComponentProps<typeof VirtualParentSC>) {
  const parentRef = useRef<HTMLElement>(null)
  const height = 14

  console.log('parentRef', parentRef.current)
  const rowCount = rows.length
  const getScrollElement = useCallback(() => parentRef.current, [parentRef])
  const getItemKey = useCallback(
    (index: number) => {
      const row = rows?.[index]

      return row
        ? getRowId?.(row) || (row as any).id || (row as any).node.id
        : index
    },
    [getRowId, rows]
  )

  const virtualizer = useVirtualizer({
    count: rowCount,
    overscan: 10,
    getScrollElement,
    getItemKey,
    estimateSize: (index) => height + (index === rowCount - 1 ? 0 : gap),
    measureElement: (el) => {
      console.log('measure el', el)
      // Since <td>s are rendered with `display: contents`, we need to calculate
      // row height from contents using Range
      if (el?.getBoundingClientRect().height <= 0 && el?.hasChildNodes()) {
        const range = document.createRange()

        range.setStart(el, 0)
        range.setEnd(el, el.childNodes.length)

        return range.getBoundingClientRect().height
      }

      return el.getBoundingClientRect().height
    },
    ...reactVirtualOptions,
  })
  const virtualRows = virtualizer.getVirtualItems()
  const virtualHeight = virtualizer.getTotalSize()

  useEffect(() => {
    const vItems = virtualizer.getVirtualItems()
    const lastItem = vItems[vItems.length - 1]

    if (!lastItem) {
      return
    }

    if (lastItem.index >= rowCount - 1 && hasNextPage && !isLoadingNextPage) {
      // loadNextPage?.()
    }
  }, [hasNextPage, loadNextPage, isLoadingNextPage, virtualizer, rowCount])

  return (
    <VirtualParentSC
      className="virtualParent"
      ref={parentRef}
      {...props}
    >
      <VirtualListSC
        className="virtualHeight"
        style={{
          height: virtualHeight,
        }}
      >
        <VirtualItemsSC
          style={{
            transform: `translateY(${virtualRows[0]?.start ?? 0}px)`,
          }}
        >
          {virtualRows.map((virtualRow) => {
            const isLoaderRow = virtualRow.index > rowCount - 1
            const isLast = virtualRow.index === rowCount - 1
            const row = rows[virtualRow.index]

            if (isLoaderRow) {
              console.log('isLoaderRow')

              return <div key="loaderRow">Loading</div>
            }
            if (!row) {
              return null
            }

            return (
              <VirtualItemSC
                key={virtualRow.key}
                // This data-index attribute is required by react-virtual
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                $isLast={isLast}
                $gap={gap}
              >
                {renderer({ row, meta })}
              </VirtualItemSC>
            )
          })}
        </VirtualItemsSC>
      </VirtualListSC>
    </VirtualParentSC>
  )
}
