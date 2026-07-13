import {
  ArrowTopRightIcon,
  Button,
  Card,
  Flex,
  IconFrame,
  PrIcon,
} from '@pluralsh/design-system'
import { AgentTodosTimeline } from 'components/ai/common/AgentTodosTimeline'
import { WorkbenchLinkChip } from 'components/workbenches/common/WorkbenchLinkChip'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import {
  AgentRunFragment,
  AgentRunStatus,
  AgentTodoFragment,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

function normalizeTodos(todos: AgentTodoFragment[]) {
  return todos
    .filter(isNonNullable)
    .map((todo) => ({
      ...todo,
      title: todo.title?.trim() ?? '',
      description: todo.description?.trim() ?? '',
      done: !!todo.done,
    }))
    .filter((todo) => todo.title.length > 0 || todo.description.length > 0)
}

export function AgentRunWorkingTheory({
  run,
  todos: rawTodos,
  onViewDiff,
  onApprove,
  approving,
}: {
  run: AgentRunFragment
  todos: AgentTodoFragment[]
  onViewDiff: () => void
  onApprove: () => void
  approving: boolean
}) {
  const isApprovable =
    run.status === AgentRunStatus.PendingApproval && !run.approvedAt

  const todos = normalizeTodos(rawTodos)

  return (
    <Flex
      direction="column"
      gap="xlarge"
    >
      <AgentRunStatusCallout
        run={run}
        isApprovable={isApprovable}
        approving={approving}
        onApprove={onApprove}
        onViewDiff={onViewDiff}
      />
      {todos.length > 0 && (
        <AgentTodosTimeline
          title="Agent todos"
          todos={todos}
        />
      )}
    </Flex>
  )
}

function AgentRunStatusCallout({
  run,
  isApprovable,
  approving,
  onApprove,
  onViewDiff,
}: {
  run: AgentRunFragment
  isApprovable: boolean
  approving: boolean
  onApprove: () => void
  onViewDiff: () => void
}) {
  const theme = useTheme()
  const pullRequest = run.pullRequests?.[0]
  const title = pullRequest?.title ?? agentRunStatusTitle(run.status)
  const summary = run.analysis?.summary
  const hasPatch = !!run.upload?.patch
  const workbenchJob = run.workbenchJob
  const workbench = workbenchJob?.workbench
  const showWorkbenchChip =
    !!workbenchJob?.id && !!workbench?.id && !!workbench.name

  return (
    <Card
      fillLevel={1}
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        padding: theme.spacing.medium,
        width: '100%',
        borderLeft: `3px solid ${theme.colors[statusToBorderColor[run.status]]}`,
      }}
    >
      <StretchedFlex
        align="start"
        gap="medium"
      >
        <StackedText
          truncate
          first={title}
          firstPartialType="body2Bold"
          firstColor="text-light"
          second={pullRequest?.title ? agentRunStatusTitle(run.status) : null}
          secondColor="text-xlight"
          icon={
            <IconFrame
              circle
              size="large"
              type="secondary"
              icon={
                <PrIcon
                  size="small"
                  color="icon-light"
                />
              }
              css={{ flexShrink: 0 }}
            />
          }
          css={{ flex: 1, minWidth: 0 }}
        />
      </StretchedFlex>
      {summary && (
        <Body2P
          $color="text-light"
          css={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {summary}
        </Body2P>
      )}
      {(hasPatch || pullRequest?.url || isApprovable || showWorkbenchChip) && (
        <StretchedFlex
          align="center"
          gap="small"
        >
          {showWorkbenchChip && (
            <WorkbenchLinkChip
              workbenchId={workbench.id}
              workbenchName={workbench.name}
              workbenchJobId={workbenchJob.id}
              css={{ flexShrink: 0 }}
            />
          )}
          {(hasPatch || pullRequest?.url || isApprovable) && (
            <Flex
              gap="small"
              css={{ marginLeft: 'auto' }}
            >
              {hasPatch ? (
                <Button
                  small
                  secondary
                  onClick={onViewDiff}
                >
                  View diff
                </Button>
              ) : (
                pullRequest?.url && (
                  <Button
                    small
                    secondary
                    as="a"
                    href={pullRequest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<ArrowTopRightIcon size={12} />}
                  >
                    View PR
                  </Button>
                )
              )}
              {isApprovable && (
                <Button
                  small
                  onClick={onApprove}
                  loading={approving}
                >
                  Approve & create PR
                </Button>
              )}
            </Flex>
          )}
        </StretchedFlex>
      )}
    </Card>
  )
}

function agentRunStatusTitle(status: AgentRunStatus) {
  switch (status) {
    case AgentRunStatus.PendingApproval:
      return 'Approval required'
    case AgentRunStatus.Successful:
      return 'Run complete'
    case AgentRunStatus.Failed:
      return 'Run failed'
    case AgentRunStatus.Cancelled:
      return 'Run cancelled'
    case AgentRunStatus.Babysitting:
      return 'Babysitting'
    case AgentRunStatus.Running:
      return 'Agent run in progress'
    case AgentRunStatus.Pending:
      return 'Agent run pending'
  }
}

const statusToBorderColor = {
  [AgentRunStatus.PendingApproval]: 'icon-warning',
  [AgentRunStatus.Successful]: 'icon-success',
  [AgentRunStatus.Failed]: 'icon-danger',
  [AgentRunStatus.Cancelled]: 'icon-xlight',
  [AgentRunStatus.Babysitting]: 'icon-info',
  [AgentRunStatus.Running]: 'icon-info',
  [AgentRunStatus.Pending]: 'icon-info',
} as const
