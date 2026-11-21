import {
  DevboxPullRequestFragment,
  PrStatus,
  useDevboxPullRequestsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

// console polls the scm for merges and closes, so this picks them up without a reload
const POLL_INTERVAL = 60_000

// the instance's pull requests; every caller shares the one cached query, so `poll` only needs to be set once
export function useDevboxPullRequests(
  instanceId: Nullable<string>,
  { poll = false }: { poll?: boolean } = {}
) {
  const { data, refetch } = useDevboxPullRequestsQuery({
    variables: { devboxInstanceId: instanceId ?? '' },
    skip: !instanceId,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    pollInterval: poll ? POLL_INTERVAL : 0,
  })
  const pullRequests = useMemo(
    () => mapExistingNodes(data?.pullRequests),
    [data?.pullRequests]
  )
  const open = useMemo(() => openPullRequests(pullRequests), [pullRequests])
  return { pullRequests, open, refetch }
}

export const openPullRequests = (prs: DevboxPullRequestFragment[]) =>
  prs.filter((pr) => pr.status === PrStatus.Open)

// open pull requests by the thread they were opened from
export function openPullRequestsByThread(prs: DevboxPullRequestFragment[]) {
  const byThread = new Map<string, DevboxPullRequestFragment[]>()
  for (const pr of openPullRequests(prs)) {
    const id = pr.devboxThread?.id
    if (id) byThread.set(id, [...(byThread.get(id) ?? []), pr])
  }
  return byThread
}
