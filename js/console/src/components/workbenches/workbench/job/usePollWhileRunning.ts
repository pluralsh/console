import { usePrevious } from '@pluralsh/design-system'
import { useEffect } from 'react'

// Subscriptions keep job views current, but delivery isn't guaranteed, so
// queries they cover still poll at this slower rate as a fallback.
export const WORKBENCH_JOB_FALLBACK_POLL_INTERVAL = 60_000

type Pollable = {
  startPolling: (interval: number) => void
  stopPolling: () => void
  refetch: () => unknown
}

// Polls only while the job runs, since finished jobs don't change, and
// refetches once when it stops so the final state isn't missed.
export function usePollWhileRunning(
  { startPolling, stopPolling, refetch }: Pollable,
  running: boolean,
  interval = WORKBENCH_JOB_FALLBACK_POLL_INTERVAL
) {
  const wasRunning = usePrevious(running)

  useEffect(() => {
    if (!running || interval <= 0) return
    startPolling(interval)
    return () => stopPolling()
  }, [interval, running, startPolling, stopPolling])

  useEffect(() => {
    if (wasRunning && !running) refetch()
  }, [refetch, running, wasRunning])
}
