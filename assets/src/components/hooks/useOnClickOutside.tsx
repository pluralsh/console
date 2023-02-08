// From: https://usehooks.com/useOnClickOutside/

import { MutableRefObject, useCallback, useEffect } from 'react'

export function useOnClickOutside(ref:MutableRefObject<any>, handler:(event:Event)=> any) {
  const cachedHandler = useCallback(handler, [handler])

  useEffect(() => {
    const listener = (event:Event) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }
      cachedHandler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, cachedHandler])
}
