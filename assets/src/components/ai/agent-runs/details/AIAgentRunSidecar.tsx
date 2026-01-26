import { Sidecar, SidecarItem, Chip, Checkbox } from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  AgentRunFragment,
  AgentTodo,
  useAgentRunDeltaSubscription,
  AgentRunStatus,
} from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

export function AgentRunSidecar({
  run,
  loading,
}: {
  run: Nullable<AgentRunFragment>
  loading: boolean
}) {
  const [todos, setTodos] = useState<Array<AgentTodo>>(
    run?.todos as Array<AgentTodo>
  )

  useAgentRunDeltaSubscription({
    skip: !run?.id || run?.status !== AgentRunStatus.Running,
    variables: { runId: run?.id ?? '' },
    onData: ({ data: { data } }) =>
      setTodos(data?.agentRunDelta?.payload?.todos as Array<AgentTodo>),
  })

  return (
    <ResponsiveLayoutSidecarContainer $breakpointWidth={768}>
      {!run ? (
        loading ? (
          <SidecarSkeleton />
        ) : null
      ) : (
        <Sidecar>
          <SidecarItem heading="ID">{run.id}</SidecarItem>
          <SidecarItem heading="Status">
            <RunStatusChip status={run.status} />
          </SidecarItem>
          {run.mode && (
            <SidecarItem heading="Mode">
              <Chip
                size="small"
                severity="info"
              >
                {capitalize(run.mode)}
              </Chip>
            </SidecarItem>
          )}
          {run.runtime?.name && (
            <SidecarItem heading="Runtime">{run.runtime.name}</SidecarItem>
          )}
          {!isEmpty(todos) && (
            <SidecarItem heading="Todos">
              {todos?.filter(isNonNullable).map((todo) => (
                <StackedText
                  key={todo.title}
                  first={todo.title}
                  second={todo.description}
                  icon={
                    <Checkbox
                      small
                      checked={!!todo.done}
                      style={{ userSelect: 'none', cursor: 'default' }}
                    />
                  }
                />
              ))}
            </SidecarItem>
          )}
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}
