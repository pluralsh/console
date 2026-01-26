import {
  Accordion,
  AccordionItem,
  CheckOutlineIcon,
  Chip,
  CircleDashIcon,
  Flex,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import {
  AgentRunFragment,
  AgentRunStatus,
  AgentRuntimeType,
  AgentTodoFragment,
  useAgentRunDeltaSubscription,
} from 'generated/graphql'
import { produce } from 'immer'
import { capitalize, isEmpty, uniqBy } from 'lodash'
import { useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

export function AgentRunSidecar({
  run,
  loading,
}: {
  run: Nullable<AgentRunFragment>
  loading: boolean
}) {
  const { spacing } = useTheme()
  const [subscribedTodos, setSubscribedTodos] = useState<AgentTodoFragment[]>(
    []
  )
  const RuntimeIcon =
    runtimeToIcon[run?.runtime?.type ?? AgentRuntimeType.Custom]

  useAgentRunDeltaSubscription({
    skip: !run?.id || run?.status !== AgentRunStatus.Running,
    variables: { runId: run?.id ?? '' },
    onData: ({ data: { data } }) =>
      setSubscribedTodos(
        produce(subscribedTodos, (todos) => {
          const payload =
            data?.agentRunDelta?.payload?.todos?.filter(isNonNullable)
          if (payload) todos.push(...payload)
        })
      ),
  })

  const todos = useMemo(
    () =>
      uniqBy(
        (run?.todos ?? []).concat(subscribedTodos).filter(isNonNullable),
        'title'
      ),
    [subscribedTodos, run?.todos]
  )

  return (
    <ContainerSC $breakpointWidth={768}>
      {!run ? (
        loading ? (
          <SidecarSkeleton />
        ) : null
      ) : (
        <Sidecar>
          <SidecarItem heading="ID">{run.id}</SidecarItem>
          {run.runtime?.name && (
            <SidecarItem heading="Runtime">
              <Flex
                align="center"
                gap="xsmall"
              >
                <RuntimeIcon fullColor />
                {capitalize(run.runtime.name)}
              </Flex>
            </SidecarItem>
          )}
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
        </Sidecar>
      )}
      {!isEmpty(todos) && (
        <Sidecar>
          <SidecarItem heading="Summary of agent activities">
            <TodoAccordionSC type="multiple">
              {todos.map((todo) => (
                <AccordionItem
                  key={todo.title}
                  trigger={
                    <Flex
                      align="center"
                      gap="xsmall"
                      minWidth={0}
                    >
                      {todo.done ? (
                        <CheckOutlineIcon color="icon-light" />
                      ) : (
                        <CircleDashIcon color="icon-light" />
                      )}
                      <CaptionP
                        $color="text-light"
                        css={{ fontWeight: 700, ...TRUNCATE }}
                      >
                        {todo.title}
                      </CaptionP>
                    </Flex>
                  }
                  padding="none"
                  caret="right-quarter"
                >
                  <CaptionP
                    $color="text-light"
                    css={{ lineHeight: '24px', paddingLeft: spacing.large }}
                  >
                    {todo.description}
                  </CaptionP>
                </AccordionItem>
              ))}
            </TodoAccordionSC>
          </SidecarItem>
        </Sidecar>
      )}
    </ContainerSC>
  )
}

const TodoAccordionSC = styled(Accordion)(({ theme }) => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  marginTop: theme.spacing.small,
}))

const ContainerSC = styled(ResponsiveLayoutSidecarContainer)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  width: 268,
}))
