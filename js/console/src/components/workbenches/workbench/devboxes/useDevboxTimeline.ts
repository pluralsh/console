import { omit } from 'lodash'
import { useApolloClient } from '@apollo/client'
import { useSubscriptionRecovery } from 'components/hooks/useSubscriptionRecovery'
import { DevboxTimelineDocument } from 'generated/graphql-documents'
import {
  DevboxTimelineQuery,
  DevboxTimelineQueryVariables,
  useDevboxInstanceEntityDeltaSubscription,
} from 'generated/graphql'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  devboxTimelineReducer,
  EMPTY_DEVBOX_TIMELINE,
  selectOldestPosition,
} from './devboxTimeline'

const PAGE_SIZE = 200
// how long a gap in a session's deltas may stay open before the page reloads
const GAP_RESYNC_MS = 2000

type Timeout = ReturnType<typeof setTimeout>

// one live store per instance: a single delta subscription feeds every
// session (threads and subagents), and pages load per session on demand
export function useDevboxTimelineStore(instanceId: Nullable<string>) {
  const client = useApolloClient()
  const [store, dispatch] = useReducer(
    devboxTimelineReducer,
    EMPTY_DEVBOX_TIMELINE
  )
  const [errors, setErrors] = useState<Record<string, Error>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const requested = useRef(new Set<string>())
  const storeRef = useRef(store)
  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    requested.current.clear()
    dispatch({ type: 'reset' })
  }, [instanceId])

  const entityDeltas = useDevboxInstanceEntityDeltaSubscription({
    variables: { instanceId: instanceId ?? '' },
    skip: !instanceId,
    onData: ({ data: { data } }) => {
      const change = data?.devboxInstanceDelta?.payload
      if (change) dispatch({ type: 'delta', change })
    },
  })

  const fetchPage = useCallback(
    (sessionId: string, older: boolean) => {
      if (!instanceId) return
      const before = older
        ? selectOldestPosition(storeRef.current.sessions[sessionId])
        : undefined
      setLoading((l) => ({ ...l, [sessionId]: true }))
      return client
        .query<DevboxTimelineQuery, DevboxTimelineQueryVariables>({
          query: DevboxTimelineDocument,
          variables: {
            instanceId,
            sessionId,
            limit: PAGE_SIZE,
            ...(before != null ? { before } : {}),
          },
          fetchPolicy: 'network-only',
        })
        .then(({ data }) => {
          if (data?.devboxTimeline)
            dispatch({
              type: 'page',
              sessionId,
              page: data.devboxTimeline,
              older,
            })
          setErrors((errs) => omit(errs, sessionId))
        })
        .catch((e) => {
          if (!older) requested.current.delete(sessionId)
          setErrors((errs) => ({ ...errs, [sessionId]: e as Error }))
        })
        .then(() => setLoading((l) => ({ ...l, [sessionId]: false })))
    },
    [client, instanceId]
  )

  const ensureSession = useCallback(
    (sessionId: Nullable<string>) => {
      if (!sessionId || requested.current.has(sessionId)) return
      requested.current.add(sessionId)
      fetchPage(sessionId, false)
    },
    [fetchPage]
  )

  // after a reconnect, deltas may have been missed: reload loaded sessions
  const reload = useCallback(() => {
    for (const sessionId of requested.current) fetchPage(sessionId, false)
  }, [fetchPage])
  const subscriptionDown = useSubscriptionRecovery(entityDeltas, {
    skip: !instanceId,
    onRecover: reload,
  })

  // a gap in a session's deltas that doesn't fill, or a delta its page can't
  // order, means deltas were lost: reload the newest page and resume from it
  const resyncing = useRef(new Set<string>())
  const gaps = useRef(
    new Map<string, { seq: Nullable<number>; timer: Timeout }>()
  )
  const resync = useCallback(
    (sessionId: string) => {
      if (resyncing.current.has(sessionId)) return
      resyncing.current.add(sessionId)
      Promise.resolve(fetchPage(sessionId, false)).then(() =>
        setTimeout(() => resyncing.current.delete(sessionId), GAP_RESYNC_MS)
      )
    },
    [fetchPage]
  )
  useEffect(() => {
    for (const [sessionId, session] of Object.entries(store.sessions)) {
      if (session.loaded && session.stale) resync(sessionId)
      const gap =
        session.loaded &&
        !session.stale &&
        Object.keys(session.pending).length > 0
      const timer = gaps.current.get(sessionId)
      if (timer && (!gap || timer.seq !== session.seq)) {
        clearTimeout(timer.timer)
        gaps.current.delete(sessionId)
      }
      if (gap && !gaps.current.has(sessionId))
        gaps.current.set(sessionId, {
          seq: session.seq,
          timer: setTimeout(() => {
            gaps.current.delete(sessionId)
            resync(sessionId)
          }, GAP_RESYNC_MS),
        })
    }
  }, [store.sessions, resync])
  useEffect(() => {
    const timers = gaps.current
    const inFlight = resyncing.current
    return () => {
      for (const { timer } of timers.values()) clearTimeout(timer)
      timers.clear()
      inFlight.clear()
    }
  }, [instanceId])

  return {
    store,
    dispatch,
    ensureSession,
    loadOlder: (sessionId: string) => fetchPage(sessionId, true),
    reload,
    errors,
    loading,
    subscriptionDown,
    restartSubscription: entityDeltas.restart,
  }
}

export type DevboxTimelineStoreApi = ReturnType<typeof useDevboxTimelineStore>
