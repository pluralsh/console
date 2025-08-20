import { Flex, Spinner } from '@pluralsh/design-system'
import {
  ReactNode,
  RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import { mergeRefs } from 'react-merge-refs'
import styled, { useTheme } from 'styled-components'
import { VirtualizerProps, VList, VListHandle } from 'virtua'

type BaseProps<T> = {
  data: T[]
  listRef?: RefObject<VListHandle | null>
  loadNextPage?: () => void
  hasNextPage?: boolean
  isLoadingNextPage?: boolean
  getRowId?: (row: T) => string
  topContent?: ReactNode
  bottomContent?: ReactNode
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
  topContent,
  bottomContent,
  ...props
}: BaseProps<T> & { renderer: Renderer<T, M | undefined>; meta?: M }) {
  const internalRef = useRef<VListHandle>(null)
  const hasInitiallyAligned = useRef(false)
  const shouldStickToBottom = useRef(true)

  // initially align to top normally, or bottom if reversed
  useLayoutEffect(() => {
    if (hasInitiallyAligned.current) return
    hasInitiallyAligned.current = true
    internalRef.current?.scrollToIndex(isReversed ? Infinity : 0)
  }, [isReversed])

  // stick to bottom if user scrolls there and bottomContent or num items is changing (only applies to reversed lists)
  useLayoutEffect(() => {
    if (isReversed && shouldStickToBottom.current)
      internalRef.current?.scrollToIndex(Infinity, { align: 'end' })
  }, [data.length, bottomContent, isReversed])

  const onScroll = useCallback(
    (offset: number) => {
      if (!internalRef.current) return
      const { viewportSize, scrollSize, findStartIndex, findEndIndex } =
        internalRef.current

      // enable sticky bottom when scrolled there (within 5px buffer), otherwise disable
      if (scrollSize - (offset + viewportSize) < 5)
        shouldStickToBottom.current = true
      else shouldStickToBottom.current = false

      // infinite scroll (weird indices add a buffer and account for top/bottom content)
      if (!hasNextPage || !hasInitiallyAligned.current || isLoadingNextPage)
        return
      if (
        isReversed ? findStartIndex?.() <= 1 : findEndIndex?.() >= data.length
      )
        loadNextPage?.()
    },
    [hasNextPage, isLoadingNextPage, isReversed, data.length, loadNextPage]
  )
  return (
    <VList
      // only shift when infinite scrolling up (and not currently at the bottom)
      shift={
        isReversed &&
        (internalRef.current?.scrollOffset ?? Infinity) < 50 &&
        !shouldStickToBottom.current
      }
      css={{ height: '100%', width: '100%' }}
      onScroll={onScroll}
      {...props}
      ref={mergeRefs([listRef, internalRef])}
    >
      <div key="topContent">
        {isLoadingNextPage && isReversed && <LoaderRow />}
        {topContent}
      </div>
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
      <div key="bottomContent">
        {bottomContent}
        {isLoadingNextPage && !isReversed && <LoaderRow />}
      </div>
    </VList>
  )
}

const ItemSC = styled.div((_) => ({
  width: '100%',
}))

function LoaderRow() {
  const { colors } = useTheme()
  return (
    <Flex
      align="center"
      justify="center"
      gap="xsmall"
      height={40}
    >
      <span style={{ color: colors['text-xlight'] }}>Loading</span>
      <Spinner color={colors['text-xlight']} />
    </Flex>
  )
}
