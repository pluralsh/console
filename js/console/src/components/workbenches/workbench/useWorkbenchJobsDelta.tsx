import { ApolloCache } from '@apollo/client'
import {
  Delta,
  useWorkbenchJobDeltaSubscription,
  WorkbenchJobTinyFragment,
  WorkbenchJobsQuery,
} from 'generated/graphql'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { WorkbenchJobsDocument } from 'generated/graphql-documents'
import { appendConnection } from 'utils/graphql'
import { WORKBENCH_JOBS_PAGE_SIZE } from './workbenchJobsDisplay'
import { RECENT_JOBS_FOR_WARNING } from './WorkbenchPromptModeSelector/WorkbenchBudgetSpendCapWarning'

// the budget warning's recent jobs (read cache-first, so only updated here),
// and the jobs tab's unfiltered, newest-first list (its first page size)
const WORKBENCH_JOBS_FIRST_VALUES = [
  RECENT_JOBS_FOR_WARNING,
  WORKBENCH_JOBS_PAGE_SIZE,
] as const

export type WorkbenchJobDeltaListener = (
  delta: Delta,
  job: WorkbenchJobTinyFragment
) => void

// fed by the workbench page's single subscription, so views under it can react
// to job deltas without each opening their own
const deltaListeners = new Map<string, Set<WorkbenchJobDeltaListener>>()

export function useWorkbenchJobsDelta(workbenchId: Nullable<string>) {
  useWorkbenchJobDeltaSubscription({
    variables: { workbenchId: workbenchId ?? undefined },
    skip: !workbenchId,
    ignoreResults: true,
    onData: ({ client, data: { data } }) => {
      const event = data?.workbenchJobDelta
      const payload = event?.payload
      if (!workbenchId || !event?.delta || !payload?.id) return

      if (event.delta === Delta.Create)
        prependJobToCachedWorkbenchJobsQueries(
          client.cache,
          workbenchId,
          payload
        )

      deltaListeners
        .get(workbenchId)
        ?.forEach((listener) => listener(event.delta!, payload))
    },
  })
}

export function useWorkbenchJobDeltaListener(
  workbenchId: string,
  listener: WorkbenchJobDeltaListener
) {
  const listenerRef = useRef(listener)

  useLayoutEffect(() => {
    listenerRef.current = listener
  })

  useEffect(() => {
    const wrapped: WorkbenchJobDeltaListener = (delta, job) =>
      listenerRef.current(delta, job)
    const listeners = deltaListeners.get(workbenchId) ?? new Set()

    listeners.add(wrapped)
    deltaListeners.set(workbenchId, listeners)

    return () => {
      listeners.delete(wrapped)
      if (listeners.size === 0) deltaListeners.delete(workbenchId)
    }
  }, [workbenchId])
}

function prependJobToCachedWorkbenchJobsQueries(
  cache: ApolloCache<object>,
  workbenchId: string,
  payload: WorkbenchJobTinyFragment
) {
  for (const first of WORKBENCH_JOBS_FIRST_VALUES) {
    // the jobs tab also selects totalCount: update the entry with it when it's
    // there, as writing it back without the count would drop it
    for (const withTotal of [true, false]) {
      const variables = { id: workbenchId, first, withTotal }
      const prev = cache.readQuery<WorkbenchJobsQuery>({
        query: WorkbenchJobsDocument,
        variables,
      })

      if (!prev?.workbench?.runs) continue

      cache.writeQuery<WorkbenchJobsQuery>({
        query: WorkbenchJobsDocument,
        variables,
        data: {
          ...prev,
          workbench: prependJobToWorkbench(prev.workbench, payload, first),
        },
      })
      break
    }
  }
}

function prependJobToWorkbench(
  workbench: NonNullable<WorkbenchJobsQuery['workbench']>,
  payload: WorkbenchJobTinyFragment,
  first: number
) {
  const loaded = workbench.runs?.edges?.length ?? 0
  const next = appendConnection(workbench, payload, 'runs')

  if (next === workbench) return workbench

  const runs = {
    ...next.runs!,
    ...(next.runs?.totalCount != null && {
      totalCount: next.runs.totalCount + 1,
    }),
  }

  // a single page keeps its size, so its end cursor still points past its
  // last job. With further pages loaded, trimming would leave that cursor
  // beyond the kept jobs and skip the dropped ones on the next page load, so
  // they're kept: the job pushed onto the next page is deduped when it loads.
  if (loaded > first || (runs.edges?.length ?? 0) <= first)
    return { ...next, runs }

  return { ...next, runs: { ...runs, edges: runs.edges?.slice(0, first) } }
}
