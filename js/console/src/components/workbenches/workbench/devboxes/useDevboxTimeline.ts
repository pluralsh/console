import { omit } from 'lodash'
import { useApolloClient } from '@apollo/client'
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

  const { error: subscriptionError } = useDevboxInstanceEntityDeltaSubscription(
    {
      variables: { instanceId: instanceId ?? '' },
      skip: !instanceId,
      onData: ({ data: { data } }) => {
        const change = data?.devboxInstanceDelta?.payload
        if (change) dispatch({ type: 'delta', change })
      },
    }
  )

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

  return {
    store,
    dispatch,
    ensureSession,
    loadOlder: (sessionId: string) => fetchPage(sessionId, true),
    reload,
    errors,
    loading,
    subscriptionError,
  }
}

export type DevboxTimelineStoreApi = ReturnType<typeof useDevboxTimelineStore>
