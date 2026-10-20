import { useLayoutEffect, useState } from 'react'

// how far outside the viewport a chart starts rendering, so it's ready on scroll
const NEAR_VIEWPORT_MARGIN = '300px'

// session replay would otherwise serialize every chart node
export const CHART_REPLAY_BLOCK_CLASS = 'sentry-block'

/** Measures the element, reporting zero size until it first nears the viewport. */
export function useChartSize<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [seen, setSeen] = useState(false)

  useLayoutEffect(() => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width)
      const height = Math.floor(entry.contentRect.height)
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])

  useLayoutEffect(() => {
    if (!el || seen) return
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setSeen(true),
      { rootMargin: NEAR_VIEWPORT_MARGIN }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [el, seen])

  return [setEl, seen ? size : { width: 0, height: 0 }] as const
}
