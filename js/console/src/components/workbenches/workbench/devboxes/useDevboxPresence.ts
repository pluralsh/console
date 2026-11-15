import {
  useLeaveDevboxInstanceMutation,
  usePingDevboxInstanceMutation,
} from 'generated/graphql'
import { useEffect, useEffectEvent } from 'react'
import { PRESENCE_HEARTBEAT_MS } from './devboxIdle'

const isVisible = () =>
  typeof document === 'undefined' || document.visibilityState === 'visible'

// a visible tab holds a viewer lease that keeps the instance awake; hiding the
// tab or leaving the page releases it so idle suspension can proceed
export function useDevboxPresence(
  instanceId: Nullable<string>,
  enabled: boolean
) {
  const [ping] = usePingDevboxInstanceMutation()
  const [leave] = useLeaveDevboxInstanceMutation()
  const sendPing = useEffectEvent((id: string) =>
    ping({ variables: { id } }).catch(() => {})
  )
  const sendLeave = useEffectEvent((id: string) =>
    leave({ variables: { id } }).catch(() => {})
  )

  useEffect(() => {
    if (!instanceId || !enabled) return
    let timer: ReturnType<typeof setInterval> | undefined
    let present = false

    const start = () => {
      if (present) return
      present = true
      sendPing(instanceId)
      timer = setInterval(() => sendPing(instanceId), PRESENCE_HEARTBEAT_MS)
    }
    const stop = () => {
      if (!present) return
      present = false
      clearInterval(timer)
      sendLeave(instanceId)
    }
    const onVisibility = () => (isVisible() ? start() : stop())

    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', stop)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', stop)
      stop()
    }
  }, [enabled, instanceId])
}
