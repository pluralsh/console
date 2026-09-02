import { useEffect, useRef, useState } from 'react'

// useful when streaming in a lot of quick messages from subscriptions (like in chats) which can be bursty
// synchronous setState in onData callbacks can nest and trip React's "update depth exceeded" guard
// batching them and deferring to a RAF callback keeps things running smooth
export function useStreamBuffer<T>(initialValue: T[] = []) {
  const [value, setValue] = useState<T[]>(initialValue)
  const streamRef = useRef<{ buffer: T[]; rafId: number }>({
    buffer: [],
    rafId: 0,
  })
  const stream = streamRef.current

  const push = (item: T) => {
    stream.buffer.push(item)

    if (!stream.rafId) {
      stream.rafId = requestAnimationFrame(() => {
        stream.rafId = 0
        const flushed = stream.buffer
        stream.buffer = []
        setValue((prev) => [...prev, ...flushed])
      })
    }
  }

  const clear = () => {
    cancelAnimationFrame(stream.rafId)
    stream.rafId = 0
    stream.buffer = []
    setValue([])
  }

  useEffect(() => () => cancelAnimationFrame(streamRef.current.rafId), [])

  return {
    value,
    setValue,
    push,
    clear,
  }
}
