import { useEffect, useRef, useState } from 'react'

const MAX_BACKOFF_MS = 30_000
// how long a restarted subscription must go without erroring to count as recovered
export const SUBSCRIPTION_SETTLE_MS = 3_000

// Apollo ends a subscription for good once it errors and keeps reporting that
// error, though the socket itself reconnects. This restarts an errored
// subscription with backoff and reports it down until a restart holds, then
// calls onRecover so the caller can catch up on what it missed.
export function useSubscriptionRecovery(
  { error, restart }: { error?: unknown; restart: () => void },
  { skip = false, onRecover }: { skip?: boolean; onRecover?: () => void } = {}
): boolean {
  // set between a restart and it settling, while `error` reads clear
  const [recovering, setRecovering] = useState(false)
  const attempts = useRef(0)
  const onRecoverRef = useRef(onRecover)
  useEffect(() => {
    onRecoverRef.current = onRecover
  })

  useEffect(() => {
    if (skip) {
      attempts.current = 0
      return
    }
    if (!error) return
    const delay = Math.min(1000 * 2 ** attempts.current, MAX_BACKOFF_MS)
    attempts.current += 1
    const timer = setTimeout(() => {
      setRecovering(true)
      restart()
    }, delay)
    return () => clearTimeout(timer)
  }, [error, restart, skip])

  useEffect(() => {
    if (skip || error || !recovering) return
    const timer = setTimeout(() => {
      attempts.current = 0
      setRecovering(false)
      onRecoverRef.current?.()
    }, SUBSCRIPTION_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [error, recovering, skip])

  return !skip && (!!error || recovering)
}
