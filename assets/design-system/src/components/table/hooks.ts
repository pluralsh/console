import type { VirtualItem } from '@tanstack/react-virtual'
import { type RefObject, useEffect, useRef, useState } from 'react'

import usePrevious from '../../hooks/usePrevious'

import { type VirtualSlice } from './tableUtils'

export function useIsScrolling(
  ref: RefObject<HTMLElement>,
  {
    onIsScrollingChange: onScrollingChange,
    restDelay = 350,
  }: { onIsScrollingChange: (isScrolling: boolean) => void; restDelay?: number }
) {
  const [isScrolling, setIsScrolling] = useState(false)
  const timeout = useRef<number | null>(null)

  useEffect(() => {
    onScrollingChange?.(isScrolling)
  }, [isScrolling, onScrollingChange])

  useEffect(() => {
    if (ref.current) {
      const el = ref.current

      const scrollHandler = () => {
        setIsScrolling(true)
        window.clearTimeout(timeout.current)
        timeout.current = window.setTimeout(() => {
          setIsScrolling(false)
        }, restDelay)
      }

      el.addEventListener('scroll', scrollHandler, { passive: true })

      return () => {
        el.removeEventListener('scroll', scrollHandler)
      }
    }
  }, [ref, restDelay])
}

export function useOnVirtualSliceChange({
  virtualRows,
  virtualizeRows,
  onVirtualSliceChange,
}: {
  virtualRows: VirtualItem[]
  virtualizeRows: boolean
  onVirtualSliceChange: (slice: VirtualSlice) => void
}) {
  const sliceStartRow = virtualRows[0]
  const sliceEndRow: VirtualItem = virtualRows[virtualRows.length - 1]
  const prevSliceStartRow = usePrevious(virtualRows[0])
  const prevSliceEndRow = usePrevious(virtualRows[virtualRows.length - 1])

  useEffect(() => {
    if (
      virtualizeRows &&
      (prevSliceEndRow !== sliceEndRow || prevSliceStartRow !== sliceStartRow)
    ) {
      onVirtualSliceChange?.({ start: sliceStartRow, end: sliceEndRow })
    }
  }, [
    sliceStartRow,
    sliceEndRow,
    virtualizeRows,
    onVirtualSliceChange,
    prevSliceEndRow,
    prevSliceStartRow,
  ])
}
