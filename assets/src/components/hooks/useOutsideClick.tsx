import { RefObject, useEffect, useState } from 'react'

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  preventFirstFire = false
) {
  const [firstFire, setFirstFire] = useState(true)

  useEffect(() => {
    function handleClick(event: MouseEvent | TouchEvent) {
      if (!ref.current && preventFirstFire && !firstFire) {
        setFirstFire(true)

        return
      }

      if (!ref.current || ref.current.contains(event.target as Node)) return

      if (firstFire && preventFirstFire) {
        setFirstFire(false)

        return
      }

      handler(event)
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('touchstart', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [ref, firstFire, preventFirstFire, handler])
}
