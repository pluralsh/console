import { RefObject, useEffect } from 'react'

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  options?: Parameters<typeof addEventListener>[2]
) {
  useEffect(() => {
    function handleClick(event: MouseEvent | TouchEvent) {
      if (!ref.current || ref.current.contains(event.target as Node)) return

      handler(event)
    }

    document.addEventListener('click', handleClick, options)
    document.addEventListener('touchstart', handleClick, options)

    return () => {
      document.removeEventListener('click', handleClick, options)
      document.removeEventListener('touchstart', handleClick, options)
    }
  }, [ref, handler, options])
}
