import {
  DevboxInstanceStatus,
  useLeaveDevboxInstanceMutation,
  usePingDevboxInstanceMutation,
} from 'generated/graphql'
import { useEffect, useEffectEvent } from 'react'
import { isInstanceLive, PRESENCE_HEARTBEAT_MS } from './devboxIdle'

const isVisible = () =>
  typeof document === 'undefined' || document.visibilityState === 'visible'

// a visible tab holds a viewer lease that keeps the instance awake; hiding the
// tab or leaving the page releases it so idle suspension can proceed. Pings
// continue while suspended: the server resumes an idle suspend on a ping (one
// that raced the lease, or happened while the tab was hidden), so showing the
// tab wakes the box without a click
export function useDevboxPresence(
  instanceId: Nullable<string>,
  status: Nullable<DevboxInstanceStatus>
) {
  const [ping] = usePingDevboxInstanceMutation()
  const [leave] = useLeaveDevboxInstanceMutation()
  const sendPing = useEffectEvent((id: string) =>
    ping({ variables: { id } }).catch(() => {})
  )
  const sendLeave = useEffectEvent((id: string) =>
    leave({ variables: { id } }).catch(() => {})
  )
  const suspended = status === DevboxInstanceStatus.Suspended
  const enabled = isInstanceLive(status) || suspended

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

  // don't wait out the heartbeat when it suspends under a visible tab
  useEffect(() => {
    if (instanceId && suspended && isVisible()) sendPing(instanceId)
  }, [instanceId, suspended])
}
