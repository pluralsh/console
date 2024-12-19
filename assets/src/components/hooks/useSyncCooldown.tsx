import { useEffect, useRef, useState } from 'react'

export function useSyncCooldown(
  end: Date | null | undefined,
  cooldown: number,
  timerInterval: number = 1000
): {
  disabled: boolean
  secondsRemaining: number | null
} {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(0)
  const [disabled, setDisabled] = useState<boolean>(true)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (!end) {
      setDisabled(false)
      setSecondsRemaining(null)

      return
    }
    const updateCountdown = () => {
      const now = new Date()
      const remaining = end.getTime() + cooldown - now.getTime()

      if (remaining > 0) {
        setDisabled(true)
        setSecondsRemaining(Math.ceil(remaining / 1000))
      } else {
        setDisabled(false)
        setSecondsRemaining(null)
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    updateCountdown()

    intervalRef.current = setInterval(updateCountdown, timerInterval)

    return () => clearInterval(intervalRef.current)
  }, [end, timerInterval])

  return {
    disabled,
    secondsRemaining,
  }
}
