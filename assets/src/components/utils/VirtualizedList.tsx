import type { ComponentPropsWithRef, ReactNode, RefObject } from 'react'
import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useResizeObserver } from '@pluralsh/design-system'
import { mergeRefs } from 'react-merge-refs'

export function VirtualizedList<T>({
  scrollRef,
  items,
  renderItem,
  overscan = 10,
  estimateSize = 50,
  getItemKey,
}: {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  scrollRef?: RefObject<HTMLDivElement>
  overscan?: number
  estimateSize?: number
  getItemKey?: (index: number, item: T) => string | number
}) {
  const internalScrollRef = useRef<HTMLDivElement | null>(null)

  const keyFor = useMemo(
    () => (i: number) => (getItemKey ? getItemKey(i, items[i]) : i),
    [getItemKey, items]
  )

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => internalScrollRef.current,
    overscan,
    estimateSize: () => estimateSize,
    getItemKey: (index) => keyFor(index),
    measureElement: (element) => {
      console.log('measureElement', element)
      return 50
    },
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  console.log(virtualItems, totalSize, virtualizer)
  return (
    <div
      ref={mergeRefs([scrollRef, internalScrollRef])}
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
        width: '100%',
      }}
    >
      <button onClick={() => virtualizer.measureElement(null)}>measure</button>
      <div
        style={{
          height: totalSize,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualItems.map((vi) => (
          <MeasuredRow
            key={vi.key}
            start={vi.start}
            index={vi.index}
            measureElement={virtualizer.measureElement}
          >
            {renderItem(items[vi.index], vi.index)}
          </MeasuredRow>
        ))}
      </div>
    </div>
  )
}

function MeasuredRow({
  start,
  measureElement,
  index,
  children,
}: {
  start: number
  measureElement: (el: Element | null) => void
  index: number
} & ComponentPropsWithRef<'div'>) {
  const ref = useRef<HTMLDivElement | null>(null)

  useResizeObserver(ref, () => {
    measureElement(ref.current)
  })

  return (
    <div
      ref={ref}
      data-index={index}
      css={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        transform: `translateY(${start}px)`,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}
