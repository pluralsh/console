import { ApolloCache, useApolloClient } from '@apollo/client'
import {
  Delta,
  QueuedPromptTinyFragment,
  useQueuedPromptDeltaSubscription,
  useWorkbenchCanvasStreamSubscription,
  useWorkbenchJobActivityDeltaSubscription,
  useWorkbenchJobDeltaSubscription,
  useWorkbenchJobProgressSubscription,
  useWorkbenchJobThoughtDeltaSubscription,
  WorkbenchCanvasBlockFragment,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobFragment,
  WorkbenchJobProgressFragment,
  WorkbenchJobThoughtFragment,
} from 'generated/graphql'
import {
  WorkbenchJobActivitiesDocument,
  WorkbenchJobActivityWithThoughtsFragmentDoc,
  WorkbenchJobFragmentDoc,
} from 'generated/graphql-documents'
import { sortBy } from 'lodash'
import { useRef, useState } from 'react'
import {
  appendConnectionToEnd,
  updateCache,
  updateFragment,
} from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { isJobRunning } from './WorkbenchJobActivity'
import { isWorkbenchJobAction } from './workbenchJobActionsUtils'

const ACTION_QUERIES = ['WorkbenchJobActionSummary', 'WorkbenchJobActions']

// keyed by activity id
type WorkbenchJobLatestThoughtMap = Record<string, WorkbenchJobThoughtFragment>

export type WorkbenchJobLevelThinkingItem = WorkbenchJobProgressFragment & {
  localKey: number
}

// only returns maps of the ephemeral streams, others subs are added to Apollo cache
export function useWorkbenchJobStreams(
  jobId: Nullable<string>,
  activityQueryLoaded: boolean
) {
  const client = useApolloClient()
  const [latestThoughtMap, setLatestThoughtMap] =
    useState<WorkbenchJobLatestThoughtMap>({})
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

  useWorkbenchJobThoughtDeltaSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const thought = data?.workbenchJobThoughtDelta?.payload
      const activityId = thought?.activity?.id
      if (!thought || !activityId) return
      appendThoughtToActivityCache(client.cache, thought)
      setLatestThoughtMap((prev) => ({ ...prev, [activityId]: thought }))
    },
  })
  useWorkbenchJobActivityDeltaSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId || !activityQueryLoaded,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const activityDelta = data?.workbenchJobActivityDelta
      const activity = activityDelta?.payload

      if (activityDelta?.delta === Delta.Create) setJobLevelThinking([])

      appendActivityToCache(client.cache, jobId ?? '', activity)

      // action lists and summaries are separate connections the delta can't
      // update in place
      if (activity && isWorkbenchJobAction(activity))
        client.refetchQueries({ include: ACTION_QUERIES })
    },
  })
  useQueuedPromptDeltaSubscription({
    variables: { jobId: jobId ?? '' },
    skip: !jobId || !activityQueryLoaded,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const event = data?.queuedPromptDelta
      if (!jobId || !event?.delta || !event.payload) return
      updateQueuedPromptsInCache(
        client.cache,
        jobId,
        event.delta,
        event.payload
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

  return { latestThoughtMap, jobLevelThinking }
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

// the job's queue only holds unconsumed prompts, ordered like the server's
// list: by dequeableAt, then insertedAt
const updateQueuedPromptsInCache = (
  cache: ApolloCache<object>,
  jobId: string,
  delta: Delta,
  {
    consumedAt,
    ...prompt
  }: QueuedPromptTinyFragment & { consumedAt?: Nullable<string> }
) =>
  updateCache<WorkbenchJobActivitiesQuery>(cache, {
    query: WorkbenchJobActivitiesDocument,
    variables: { id: jobId },
    update: (prev) => {
      if (!prev.workbenchJob?.queuedPrompts) return prev
      const queued = prev.workbenchJob.queuedPrompts
      const others = (queued.edges ?? []).filter(
        (edge) => edge?.node?.id !== prompt.id
      )
      const edges =
        delta === Delta.Delete || consumedAt
          ? others
          : sortBy(
              [
                ...others,
                { __typename: 'QueuedPromptEdge' as const, node: prompt },
              ],
              [
                (edge) => edge?.node?.dequeableAt ?? '',
                (edge) => edge?.node?.insertedAt ?? '',
              ]
            )

      return {
        ...prev,
        workbenchJob: {
          ...prev.workbenchJob,
          queuedPrompts: { ...queued, edges },
        },
      }
    },
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
