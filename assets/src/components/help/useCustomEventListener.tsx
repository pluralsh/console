import { useEffect } from 'react'

export function useCustomEventListener<E extends CustomEvent>(
  eventType: string,
  listener: (e: E) => void
) {
  useEffect(() => {
    window.addEventListener(eventType, listener as EventListener)

    return () => {
      window.removeEventListener(eventType, listener as EventListener)
    }
  }, [eventType, listener])
}
