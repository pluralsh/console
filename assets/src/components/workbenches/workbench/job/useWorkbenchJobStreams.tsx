import { ApolloCache, useApolloClient } from '@apollo/client'
import {
  useWorkbenchJobActivityDeltaSubscription,
  useWorkbenchJobDeltaSubscription,
  useWorkbenchJobThoughtDeltaSubscription,
  useWorkbenchTextStreamSubscription,
  WorkbenchJobActivitiesDocument,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityWithThoughtsFragmentDoc,
  WorkbenchJobThoughtFragment,
} from 'generated/graphql'
import { Dispatch, SetStateAction, useState } from 'react'
import {
  updateCache,
  updateFragment,
  appendConnectionToEnd,
} from 'utils/graphql'
import { isActivityTerminal } from './WorkbenchJobActivities'
import { produce } from 'immer'

// keyed by activity id, 'none' value puts it at the top level of the job
type WorkbenchJobTextStreamMap = Record<string, string>

// only returns a map of the ephemeral text streams, others subs are added to Apollo cache
export function useWorkbenchJobStreams(
  jobId: Nullable<string>,
  setClosedIds: Dispatch<SetStateAction<Set<string> | null>>
) {
  const client = useApolloClient()
  const [textStreamMap, setTextStreamMap] = useState<WorkbenchJobTextStreamMap>(
    {}
  )

  useWorkbenchJobDeltaSubscription({
    variables: { id: jobId ?? '' },
    skip: !jobId,
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
      const payload = data?.workbenchJobActivityDelta?.payload
      if (
        payload?.id &&
        (isActivityTerminal(payload?.status) || !!payload.result?.output)
      )
        setClosedIds(
          (prev) => new Set(prev ? prev.add(payload.id) : new Set([payload.id]))
        )

      appendActivityToCache(
        client.cache,
        jobId ?? '',
        data?.workbenchJobActivityDelta?.payload
      )
    },
  })

  return textStreamMap
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
