import { useEffect, RefObject, useRef } from 'react'

export function useNativeDomEvent<T extends HTMLElement | null>(
  elementRef: RefObject<T>,
  eventName: string,
  callback: (e: Event) => void,
  options?: AddEventListenerOptions
) {
  // so we don't need to memoize with useCallback, but also don't re-create the listener on every render
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const handler = (e: Event) => callbackRef.current(e)
    const element = elementRef.current
    if (!element) return

    element.addEventListener(eventName, handler, options)
    return () => element.removeEventListener(eventName, handler, options)
  }, [elementRef, eventName, options])
}
