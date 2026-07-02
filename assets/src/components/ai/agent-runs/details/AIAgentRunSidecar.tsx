import {
  Chip,
  ContainerRuntimeIcon,
  Flex,
  prettifyRepoUrl,
  Tooltip,
  WarningShieldIcon,
} from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { CaptionP } from 'components/utils/typography/Text'
import {
  AgentRunFragment,
  AgentRunStatus,
  AgentRuntimeType,
  AgentTodoFragment,
  useAgentRunDeltaSubscription,
} from 'generated/graphql'
import { produce } from 'immer'
import { capitalize, uniqBy } from 'lodash'
import { useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

export function AgentRunMetadata({ run }: { run: AgentRunFragment }) {
  const { colors } = useTheme()
  const isFinished =
    run.status === AgentRunStatus.Successful ||
    run.status === AgentRunStatus.Failed ||
    run.status === AgentRunStatus.Cancelled
  const RuntimeIcon =
    runtimeToIcon[run.runtime?.type ?? AgentRuntimeType.Custom]

  return (
    <Flex
      align="center"
      gap="small"
      wrap="wrap"
      css={{ rowGap: 4, minWidth: 0 }}
    >
      <CaptionP $color="text-xlight">
        {prettifyRepoUrl(run?.repository ?? '')}
      </CaptionP>
      {run.runtime?.name && (
        <Flex gap="xxsmall">
          <RuntimeIcon fullColor />
          <CaptionP $color="text-xlight">
            {capitalize(run.runtime.name)}
          </CaptionP>
        </Flex>
      )}
      {run.babysit && (
        <Tooltip label="Babysit">
          <ContainerRuntimeIcon size={12} />
        </Tooltip>
      )}
      {run.approval && (
        <Tooltip label="Approval required">
          <WarningShieldIcon size={12} />
        </Tooltip>
      )}
      {run.mode && (
        <Chip
          size="small"
          severity="info"
        >
          {capitalize(run.mode)}
        </Chip>
      )}
      <RunStatusChip
        status={run.status}
        showSpinner={false}
        size="small"
      />
      <CaptionP $color="text-input-disabled">
        Start{' '}
        <span css={{ color: colors['text-xlight'] }}>
          {formatDateTime(run.insertedAt)}
        </span>
      </CaptionP>
      {isFinished && (
        <CaptionP $color="text-input-disabled">
          End{' '}
          <span css={{ color: colors['text-xlight'] }}>
            {formatDateTime(run.updatedAt)}
          </span>
        </CaptionP>
      )}
    </Flex>
  )
}

export function useAgentRunTodos(run: Nullable<AgentRunFragment>) {
  const [subscribedTodos, setSubscribedTodos] = useState<AgentTodoFragment[]>(
    []
  )

  useAgentRunDeltaSubscription({
    skip: !run?.id || run?.status !== AgentRunStatus.Running,
    variables: { runId: run?.id ?? '' },
    onData: ({ data: { data } }) => {
      const payload = data?.agentRunDelta?.payload?.todos?.filter(isNonNullable)

      if (payload) {
        setSubscribedTodos((prev) =>
          produce(prev, (todos) => {
            todos.push(...payload)
          })
        )
      }
    },
  })

  return useMemo(
    () =>
      uniqBy(
        (run?.todos ?? []).concat(subscribedTodos).filter(isNonNullable),
        'title'
      ),
    [subscribedTodos, run?.todos]
  )
}
