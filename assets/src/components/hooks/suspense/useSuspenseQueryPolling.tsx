import { useEffect, useRef } from 'react'

export function useSuspenseQueryPolling<
  U extends { refetch: () => Promise<any> },
>(queryResult: U, { pollInterval }: { pollInterval: number }): U {
  const { refetch } = queryResult
  const timeoutIdRef = useRef<any>(null)

  useEffect(() => {
    let _stopped = false

    function startTimeout() {
      timeoutIdRef.current = setTimeout(() => {
        refetch().finally(() => {
          if (!_stopped) {
            startTimeout()
          }
        })
      }, pollInterval)
    }
    startTimeout()

    return () => {
      _stopped = true
      clearTimeout(timeoutIdRef.current)
    }
  }, [pollInterval, refetch])

  return queryResult
}
