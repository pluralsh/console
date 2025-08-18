import {
  ReactNode,
  RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import { mergeRefs } from 'react-merge-refs'
import styled from 'styled-components'
import { VirtualizerProps, VList, VListHandle } from 'virtua'

type BaseProps<T> = {
  data: T[]
  listRef?: RefObject<VListHandle | null>
  loadNextPage?: () => void
  hasNextPage?: boolean
  isLoadingNextPage?: boolean
  getRowId?: (row: T) => string
  // if true, scroll will start at bottom on mount, and fetches will be triggered at the top
  isReversed?: boolean
} & Omit<VirtualizerProps, 'ref' | 'children'>

type Renderer<T, M> = (props: { rowData: T; meta: M }) => ReactNode

// the overloads allow proper type inference for 'meta' even if it's not provided
export function VirtualList<T>(
  p: { renderer: Renderer<T, undefined>; meta?: undefined } & BaseProps<T>
): ReactNode
export function VirtualList<T, M>(
  p: { renderer: Renderer<T, M>; meta: M } & BaseProps<T>
): ReactNode
export function VirtualList<T, M>({
  listRef,
  data,
  loadNextPage,
  hasNextPage,
  isLoadingNextPage,
  isReversed = false,
  getRowId,
  renderer,
  meta,
  ...props
}: BaseProps<T> & { renderer: Renderer<T, M | undefined>; meta?: M }) {
  const internalRef = useRef<VListHandle>(null)
  const hasInitiallyAligned = useRef(false)

  // initially align to top normally, or bottom if reversed
  useLayoutEffect(() => {
    if (hasInitiallyAligned.current) return
    hasInitiallyAligned.current = true
    internalRef.current?.scrollToIndex(isReversed ? Infinity : 0)
  }, [isReversed])

  // infinite scroll
  const onScroll = useCallback(() => {
    if (!hasNextPage || !hasInitiallyAligned.current || isLoadingNextPage)
      return
    if (
      isReversed
        ? internalRef.current?.findStartIndex() === 0
        : internalRef.current?.findEndIndex() === data.length - 1
    )
      loadNextPage?.()
  }, [hasNextPage, isLoadingNextPage, isReversed, data.length, loadNextPage])

  return (
    <VList
      overscan={1}
      shift={isReversed}
      css={{ height: '100%', width: '100%' }}
      onScroll={onScroll}
      {...props}
      ref={mergeRefs([listRef, internalRef])}
    >
      {data.map((rowData, index) => (
        <ItemSC
          key={
            getRowId?.(rowData) ||
            (rowData as any).id ||
            (rowData as any).node?.id ||
            index
          }
        >
          {renderer({ rowData, meta })}
        </ItemSC>
      ))}
    </VList>
  )
}

const ItemSC = styled.div((_) => ({
  width: '100%',
}))
