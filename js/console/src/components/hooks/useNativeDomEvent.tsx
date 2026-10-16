import { useEffect, RefObject, useEffectEvent } from 'react'

export function useNativeDomEvent<T extends HTMLElement | null>(
  elementRef: RefObject<T>,
  eventName: string,
  callback: (e: Event) => void,
  options?: AddEventListenerOptions
) {
  // so we don't need to memoize with useCallback, but also don't re-create the listener on every render
  const onEvent = useEffectEvent(callback)

  useEffect(() => {
    const handler = (e: Event) => onEvent(e)
    const element = elementRef.current
    if (!element) return

    element.addEventListener(eventName, handler, options)
    return () => element.removeEventListener(eventName, handler, options)
  }, [elementRef, eventName, options])
}
