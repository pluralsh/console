import { ApolloCache } from '@apollo/client'
import {
  Delta,
  useWorkbenchJobDeltaSubscription,
  WorkbenchJobTinyFragment,
  WorkbenchJobsDocument,
  WorkbenchJobsQuery,
} from 'generated/graphql'
import { appendConnection, updateCache } from 'utils/graphql'

const WORKBENCH_JOBS_FIRST_VALUES = [3, 50, 100] as const

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
    updateCache<WorkbenchJobsQuery>(cache, {
      query: WorkbenchJobsDocument,
      variables: { id: workbenchId, first },
      update: (prev) => {
        if (!prev.workbench?.runs) return prev

        const workbench = prependJobToWorkbench(prev.workbench, payload, first)

        return { ...prev, workbench }
      },
    })
  }
}

function prependJobToWorkbench(
  workbench: NonNullable<WorkbenchJobsQuery['workbench']>,
  payload: WorkbenchJobTinyFragment,
  first: number
) {
  const next = appendConnection(workbench, payload, 'runs')
  const edges = next.runs?.edges ?? []

  if (edges.length <= first) return next

  return {
    ...next,
    runs: {
      ...next.runs!,
      edges: edges.slice(0, first),
    },
  }
}
