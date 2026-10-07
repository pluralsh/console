import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useWorkbenchJobActionSummaryQuery } from 'generated/graphql'

// `poll: false` fetches once, e.g. for a finished job whose actions won't change
export function useWorkbenchJobActionSummary(
  jobId: string,
  { poll = true }: { poll?: boolean } = {}
) {
  const { data, loading } = useWorkbenchJobActionSummaryQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: poll ? POLL_INTERVAL : 0,
  })
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
