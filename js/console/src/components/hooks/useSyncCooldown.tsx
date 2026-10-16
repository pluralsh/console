import { useEffect, useState } from 'react'

export function useSyncCooldown(
  end: Date | null | undefined,
  cooldown: number,
  timerInterval: number = 1000
): {
  disabled: boolean
  secondsRemaining: number | null
} {
  const [now, setNow] = useState(() => Date.now())
  const endTime = end ? end.getTime() + cooldown : 0
  const remaining = endTime - now
  const active = remaining > 0

  useEffect(() => {
    if (!active) return

    const tick = () => setNow(Date.now())
    // refresh right away in case `now` is stale from before `end` changed
    const timeout = setTimeout(tick)
    const interval = setInterval(tick, timerInterval)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [active, endTime, timerInterval])

  return {
    disabled: active,
    // clamped: a stale `now` overestimates `remaining` until the first tick
    secondsRemaining: active
      ? Math.ceil(Math.min(remaining, cooldown) / 1000)
      : null,
  }
}
