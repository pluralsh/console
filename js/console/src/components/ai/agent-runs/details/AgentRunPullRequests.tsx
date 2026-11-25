import { PullRequestList } from 'components/workbenches/common/PullRequestList'
import { PullRequestBasicFragment } from 'generated/graphql'

export function AgentRunPullRequests({
  pullRequests,
}: {
  pullRequests: PullRequestBasicFragment[]
}) {
  return <PullRequestList pullRequests={pullRequests} />
}
