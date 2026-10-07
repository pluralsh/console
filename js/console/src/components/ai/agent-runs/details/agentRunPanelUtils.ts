import { AgentRunFragment } from 'generated/graphql'

export type AgentRunPanelContent = Pick<
  AgentRunFragment,
  'analysis' | 'pullRequests' | 'todos' | 'upload'
>

export function hasAgentRunPanelContent(
  run: Nullable<AgentRunPanelContent>
): boolean {
  const hasImplementationPlan = (run?.todos ?? []).some(
    (todo) => !!todo && (!!todo.title?.trim() || !!todo.description?.trim())
  )
  const hasPullRequests = (run?.pullRequests ?? []).some(
    (pullRequest) => !!pullRequest?.id && !!pullRequest.url
  )

  return (
    hasImplementationPlan ||
    hasPullRequests ||
    !!run?.upload?.patch ||
    !!run?.analysis
  )
}
