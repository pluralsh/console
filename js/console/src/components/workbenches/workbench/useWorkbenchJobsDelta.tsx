import { ApolloCache } from '@apollo/client'
import {
  Delta,
  useWorkbenchJobDeltaSubscription,
  WorkbenchJobTinyFragment,
  WorkbenchJobsDocument,
  WorkbenchJobsQuery,
} from 'generated/graphql'
import { appendConnection } from 'utils/graphql'
import { WORKBENCH_JOBS_PAGE_SIZE } from './workbenchJobsDisplay'

// the launch tab's recent jobs and budget warning (3), and the jobs tab's
// unfiltered, newest-first list (its first page size)
const WORKBENCH_JOBS_FIRST_VALUES = [3, WORKBENCH_JOBS_PAGE_SIZE] as const

export function useWorkbenchJobsDelta(workbenchId: Nullable<string>) {
  useWorkbenchJobDeltaSubscription({
    variables: { workbenchId: workbenchId ?? undefined },
    skip: !workbenchId,
    ignoreResults: true,
    onData: ({ client, data: { data } }) => {
      const event = data?.workbenchJobDelta
      const payload = event?.payload
      if (!workbenchId || event?.delta !== Delta.Create || !payload?.id) return

      prependJobToCachedWorkbenchJobsQueries(client.cache, workbenchId, payload)
    },
  })
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
