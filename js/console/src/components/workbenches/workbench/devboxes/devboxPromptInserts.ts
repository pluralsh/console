import { useEffect, useRef } from 'react'
import type { VoxlPickedElement } from './voxlClient'

type Listener = (element: VoxlPickedElement) => void

// Elements picked in an instance's browser go to the prompt of the composer it
// shows. With none mounted (the browser has the main view), they wait for the
// next one.
const listeners = new Map<string, Set<Listener>>()
const pending = new Map<string, VoxlPickedElement[]>()

export function addToPrompt(instanceId: string, element: VoxlPickedElement) {
  const current = listeners.get(instanceId)
  if (current?.size) for (const l of current) l(element)
  else pending.set(instanceId, [...(pending.get(instanceId) ?? []), element])
}

// receives the elements added to an instance's prompt, the waiting ones first
export function usePromptInserts(
  instanceId: Nullable<string>,
  onInsert: Listener
) {
  const handler = useRef(onInsert)
  useEffect(() => {
    handler.current = onInsert
  })
  useEffect(() => {
    if (!instanceId) return
    const l: Listener = (el) => handler.current(el)
    const set = listeners.get(instanceId) ?? new Set()
    set.add(l)
    listeners.set(instanceId, set)
    const waiting = pending.get(instanceId) ?? []
    pending.delete(instanceId)
    for (const el of waiting) l(el)
    return () => {
      set.delete(l)
      if (!set.size) listeners.delete(instanceId)
    }
  }, [instanceId])
}
