import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useWorkbenchJobActionSummaryQuery } from 'generated/graphql'

export function useWorkbenchJobActionSummary(jobId: string) {
  const { data, loading } = useWorkbenchJobActionSummaryQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const job = data?.workbenchJob

  return {
    hasActions:
      (job?.functionActions?.edges ?? []).some((edge) => !!edge?.node?.id) ||
      (job?.kubernetesActions?.edges ?? []).some((edge) => !!edge?.node?.id),
    hasActionsAwaitingApproval: (job?.pendingActions?.edges ?? []).some(
      (edge) => !!edge?.node?.id
    ),
    isLoading: loading && !data,
  }
}
