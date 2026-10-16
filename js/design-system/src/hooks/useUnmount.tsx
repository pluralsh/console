import { useEffect, useEffectEvent } from 'react'

function useUnmount(effect: () => void) {
  const onUnmount = useEffectEvent(effect)

  useEffect(() => () => onUnmount(), [])
}

export default useUnmount
