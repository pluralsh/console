import { type RefCallback, type RefObject, useCallback, useRef } from 'react'

export function useRefResizeObserver<T extends HTMLElement>(
  ref: RefObject<T>,
  callback: (entry: ResizeObserverEntry, observer: ResizeObserver) => void,
  options: ResizeObserverOptions = {}
) {
  const observerRef = useRef<ResizeObserver | null>(null)
  const handleResize: ResizeObserverCallback = useCallback(
    (entries, observer) => {
      if (!Array.isArray(entries)) {
        return
      }

      const entry = entries[0]

      if (callback) {
        callback(entry, observer)
      }
    },
    [callback]
  )

  return useCallback<RefCallback<T>>(
    (node) => {
      observerRef.current?.disconnect?.()
      ref.current = node
      if (!node) {
        observerRef.current = null

        return
      }
      observerRef.current = new ResizeObserver(handleResize)
      observerRef.current.observe(node, options)
    },
    [ref, handleResize, options]
  )
}
