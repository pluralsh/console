import { useCallback, useEffect, RefObject, useState } from 'react'

type ScrollableDirections = {
  canScrollUp: boolean
  canScrollDown: boolean
  canScrollLeft: boolean
  canScrollRight: boolean
}

// account for rounding errors and zoom levels
const SCROLL_THRESHOLD = 1

export const useCanScroll = (
  ref: RefObject<HTMLElement | null>
): ScrollableDirections => {
  const [scrollable, setScrollable] = useState<ScrollableDirections>({
    canScrollUp: false,
    canScrollDown: false,
    canScrollLeft: false,
    canScrollRight: false,
  })

  const checkScroll = useCallback((element: HTMLElement) => {
    const scrollTop = Math.round(element.scrollTop)
    const scrollLeft = Math.round(element.scrollLeft)
    const scrollHeight = Math.round(element.scrollHeight)
    const scrollWidth = Math.round(element.scrollWidth)
    const clientHeight = Math.round(element.clientHeight)
    const clientWidth = Math.round(element.clientWidth)

    setScrollable({
      canScrollUp: scrollTop > SCROLL_THRESHOLD,
      canScrollDown: scrollHeight - scrollTop - clientHeight > SCROLL_THRESHOLD,
      canScrollLeft: scrollLeft > SCROLL_THRESHOLD,
      canScrollRight: scrollWidth - scrollLeft - clientWidth > SCROLL_THRESHOLD,
    })
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // initial check
    checkScroll(element)

    const handleScroll = () => checkScroll(element)
    element.addEventListener('scroll', handleScroll)
    const resizeObserver = new ResizeObserver(handleScroll)
    resizeObserver.observe(element)

    return () => {
      element.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [checkScroll, ref])

  return scrollable
}
