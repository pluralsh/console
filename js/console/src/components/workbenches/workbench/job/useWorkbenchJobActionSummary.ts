import { useWorkbenchJobActionSummaryQuery } from 'generated/graphql'
import { usePollWhileRunning } from './usePollWhileRunning'

// polls only while the job runs, e.g. a finished job's actions won't change
export function useWorkbenchJobActionSummary(
  jobId: string,
  { running, interval }: { running: boolean; interval?: number }
) {
  const query = useWorkbenchJobActionSummaryQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
  })
  const { data, loading } = query
  usePollWhileRunning(query, running, interval)
  const job = data?.workbenchJob

  return {
    hasActions:
      (job?.functionActions?.edges ?? []).some((edge) => !!edge?.node?.id) ||
      (job?.kubernetesActions?.edges ?? []).some((edge) => !!edge?.node?.id) ||
      (job?.execActions?.edges ?? []).some((edge) => !!edge?.node?.id),
    hasActionsAwaitingApproval: (job?.pendingActions?.edges ?? []).some(
      (edge) => !!edge?.node?.id
    ),
    isLoading: loading && !data,
  }
}
