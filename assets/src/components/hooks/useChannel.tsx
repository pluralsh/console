import { socket } from 'helpers/client'
import { useEffect } from 'react'

export function useChannel(topic, event, callback) {
  useEffect(() => {
    const channel = socket.channel(topic)

    channel
      .join()
      .receive('ok', ({ messages }) =>
        console.log('successfully joined channel', messages || '')
      )
      .receive('error', ({ reason }) =>
        console.error('failed to join channel', reason)
      )

    channel.on(event, callback)
    return () => channel.leave()
  })
}
