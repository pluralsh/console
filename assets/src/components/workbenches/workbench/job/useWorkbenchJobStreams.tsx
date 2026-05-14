import { ApolloCache, ApolloClient, useApolloClient } from '@apollo/client'
import {
  Delta,
  useWorkbenchCanvasStreamSubscription,
  useWorkbenchJobActivityDeltaSubscription,
  useWorkbenchJobDeltaSubscription,
  useWorkbenchJobProgressSubscription,
  useWorkbenchJobThoughtDeltaSubscription,
  useWorkbenchTextStreamSubscription,
  WorkbenchCanvasBlockFragment,
  WorkbenchJobActivitiesDocument,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityWithThoughtsFragmentDoc,
  WorkbenchJobFragment,
  WorkbenchJobFragmentDoc,
  WorkbenchJobProgressFragment,
  WorkbenchJobThoughtFragment,
} from 'generated/graphql'
import { Dispatch, SetStateAction, useRef, useState } from 'react'
import {
  appendConnectionToEnd,
  mapExistingNodes,
  updateCache,
  updateFragment,
} from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  defaultClosedIds,
  isActivityTerminal,
} from './workbenchJobActivityCollapse'
import { isJobRunning } from './WorkbenchJobActivity'
import { produce } from 'immer'

// keyed by activity id, 'none' value puts it at the top level of the job
type WorkbenchJobTextStreamMap = Record<string, string>

export type WorkbenchJobLevelThinkingItem = WorkbenchJobProgressFragment & {
  localKey: number
}

// only returns a map of the ephemeral text streams, others subs are added to Apollo cache
export function useWorkbenchJobStreams(
  jobId: Nullable<string>,
  setClosedIds: Dispatch<SetStateAction<Set<string> | null>>
) {
  const client = useApolloClient()
  const [textStreamMap, setTextStreamMap] = useState<WorkbenchJobTextStreamMap>(
    {}
  )
  const [jobLevelThinking, setJobLevelThinking] = useState<
    WorkbenchJobLevelThinkingItem[]
  >([])
  const thinkingKeyRef = useRef(0)

  useWorkbenchJobDeltaSubscription({
    variables: { id: jobId ?? '' },
    skip: !jobId,
    onData: ({ data: { data } }) => {
      const status = data?.workbenchJobDelta?.payload?.status
      if (status && !isJobRunning(status)) setJobLevelThinking([])
    },
  })

  useWorkbenchJobProgressSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const progress = data?.workbenchJobProgress
      if (!progress || progress.activityId) return
      setJobLevelThinking((prev) => [
        ...prev,
        { ...progress, localKey: thinkingKeyRef.current++ },
      ])
    },
  })

  useWorkbenchTextStreamSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      if (!data?.workbenchTextStream) return
      setTextStreamMap((prev) =>
        produce(prev, (d) => {
          d[data.workbenchTextStream?.activityId || 'none'] +=
            data.workbenchTextStream?.text ?? ''
        })
      )
    },
  })
  useWorkbenchJobThoughtDeltaSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const thought = data?.workbenchJobThoughtDelta?.payload
      if (!thought?.activity?.id) return
      appendThoughtToActivityCache(client.cache, thought)
    },
  })
  useWorkbenchJobActivityDeltaSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      if (data?.workbenchJobActivityDelta?.delta === Delta.Create)
        setJobLevelThinking([])

      const payload = data?.workbenchJobActivityDelta?.payload
      if (
        payload?.id &&
        (isActivityTerminal(payload?.status) || !!payload.result?.output)
      )
        setClosedIds((prev) => {
          const next = new Set(
            prev ?? readDefaultClosedIdsFromCache(client, jobId ?? '')
          )
          next.add(payload.id)
          return next
        })

      appendActivityToCache(
        client.cache,
        jobId ?? '',
        data?.workbenchJobActivityDelta?.payload
      )
    },
  })
  useWorkbenchCanvasStreamSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const block = data?.workbenchCanvasStream
      if (!block || !jobId) return
      upsertCanvasBlockInJobCache(client.cache, jobId, block)
    },
  })

  return { textStreamMap, jobLevelThinking }
}

function readDefaultClosedIdsFromCache(
  client: ApolloClient<object>,
  jobId: string
): Set<string> {
  if (!jobId) return new Set()
  try {
    const data = client.readQuery<WorkbenchJobActivitiesQuery>({
      query: WorkbenchJobActivitiesDocument,
      variables: { id: jobId },
    })
    return defaultClosedIds(mapExistingNodes(data?.workbenchJob?.activities))
  } catch {
    return new Set()
  }
}

export const appendActivityToCache = (
  cache: ApolloCache<object>,
  jobId: string,
  activity: Nullable<WorkbenchJobActivityFragment>
) =>
  updateCache<WorkbenchJobActivitiesQuery>(cache, {
    query: WorkbenchJobActivitiesDocument,
    variables: { id: jobId },
    update: (prev) => ({
      ...prev,
      workbenchJob: appendConnectionToEnd(
        prev.workbenchJob,
        activity,
        'activities'
      ),
    }),
  })

const appendThoughtToActivityCache = (
  cache: ApolloCache<object>,
  thought: WorkbenchJobThoughtFragment
) =>
  updateFragment(cache, {
    id: cache.identify({
      __typename: 'WorkbenchJobActivity',
      id: thought.activity?.id,
    }),
    fragment: WorkbenchJobActivityWithThoughtsFragmentDoc,
    fragmentName: 'WorkbenchJobActivityWithThoughts',
    update: (prev) => {
      const thoughts = prev.thoughts ?? []
      if (thoughts.some((t) => t?.id === thought.id)) return prev
      return { ...prev, thoughts: [...thoughts, thought] }
    },
  })

const upsertCanvasBlockInJobCache = (
  cache: ApolloCache<object>,
  jobId: string,
  block: WorkbenchCanvasBlockFragment
) =>
  updateFragment(cache, {
    id: cache.identify({ __typename: 'WorkbenchJob', id: jobId }),
    fragment: WorkbenchJobFragmentDoc,
    fragmentName: 'WorkbenchJob',
    update: (prev: WorkbenchJobFragment) => {
      if (!prev.result) return prev
      const existing = (prev.result.canvas ?? []).filter(isNonNullable)
      const idx = block.identifier
        ? existing.findIndex((b) => b.identifier === block.identifier)
        : -1
      const canvas =
        idx >= 0
          ? existing.map((b, i) => (i === idx ? block : b))
          : [...existing, block]
      return { ...prev, result: { ...prev.result, canvas } }
    },
  })
