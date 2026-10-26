import {
  Delta,
  InfrastructureStackDeltaSubscription,
  useInfrastructureStackDeltaSubscription,
} from 'generated/graphql'
import { useEffect, useLayoutEffect, useRef } from 'react'

// polling is only a fallback for missed socket events once a page subscribes
export const STACK_DELTA_FALLBACK_POLL_INTERVAL = 30_000

// a run update can arrive as a burst of deltas, so refetches are coalesced
const REFETCH_DEBOUNCE = 500

type StackDeltaPayload = NonNullable<
  NonNullable<
    InfrastructureStackDeltaSubscription['infrastructureStackDelta']
  >['payload']
>

export type StackDeltaListener = (
  delta: Delta,
  stack: StackDeltaPayload
) => void

// fed by a stacks page's single subscription, so views under it can react to
// stack deltas without each opening their own
const deltaListeners = new Set<StackDeltaListener>()

// Call once per top-level stacks page. Updated stacks are merged into the
// Apollo cache by id, so anything rendering their status refreshes on its own.
export function useStackDeltas() {
  useInfrastructureStackDeltaSubscription({
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const event = data?.infrastructureStackDelta
      const payload = event?.payload
      if (!event?.delta || !payload?.id) return

      deltaListeners.forEach((listener) => listener(event.delta!, payload))
    },
  })
}

export function useStackDeltaListener(listener: StackDeltaListener) {
  const listenerRef = useRef(listener)

  useLayoutEffect(() => {
    listenerRef.current = listener
  })

  useEffect(() => {
    const wrapped: StackDeltaListener = (delta, stack) =>
      listenerRef.current(delta, stack)

    deltaListeners.add(wrapped)

    return () => {
      deltaListeners.delete(wrapped)
    }
  }, [])
}

// refetches whenever the given stack changes, including status changes driven
// by its runs
export function useRefetchOnStackDelta(
  stackId: Nullable<string>,
  refetch: Nullable<() => unknown>
) {
  const refetchRef = useRef(refetch)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useLayoutEffect(() => {
    refetchRef.current = refetch
  })

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  useStackDeltaListener((_, stack) => {
    if (!stackId || stack.id !== stackId) return

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(
      () => refetchRef.current?.(),
      REFETCH_DEBOUNCE
    )
  })
}
