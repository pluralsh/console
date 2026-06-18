import {
  Accordion,
  AccordionItem,
  ArrowTopRightIcon,
  Button,
  Card,
  CheckOutlineIcon,
  Chip,
  CircleDashIcon,
  Flex,
  IconFrame,
  prettifyRepoUrl,
  PrIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import {
  AgentRunFragment,
  AgentRunStatus,
  AgentRuntimeType,
  AgentTodoFragment,
  PullRequestBasicFragment,
  useAgentRunDeltaSubscription,
} from 'generated/graphql'
import { produce } from 'immer'
import { capitalize, isEmpty, uniqBy } from 'lodash'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

export function AgentRunMetadata({ run }: { run: AgentRunFragment }) {
  const { colors } = useTheme()
  const isRunning = isJobRunning(run.status)
  const RuntimeIcon =
    runtimeToIcon[run.runtime?.type ?? AgentRuntimeType.Custom]

  return (
    <Flex
      align="center"
      gap="small"
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
      <CaptionP $color="text-input-disabled">
        End{' '}
        <span css={{ color: colors['text-xlight'] }}>
          {isRunning ? '---' : formatDateTime(run.updatedAt)}
        </span>
      </CaptionP>

      <Chip
        size="small"
        severity={run.babysit ? 'success' : 'neutral'}
      >
        {run.babysit ? 'On' : 'Off'}
      </Chip>
    </Flex>
  )
}

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
        <>
          {run?.pullRequests?.filter(isNonNullable)?.map((pr) => (
            <PullRequestCard
              key={pr.id}
              pullRequest={pr}
            />
          ))}
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
        </>
      )}
    </ContainerSC>
  )
}

function PullRequestCard({
  pullRequest,
}: {
  pullRequest: PullRequestBasicFragment
}) {
  const { colors } = useTheme()
  return (
    <PRCardSC>
      <StackedText
        first="Pull request"
        firstPartialType="body2Bold"
        firstColor="text"
        second={formatDateTime(pullRequest.insertedAt)}
        gap="xxsmall"
        icon={
          <IconFrame
            circle
            type="secondary"
            icon={<PrIcon color={colors['icon-light']} />}
          />
        }
      />
      <Body2P $color="text-xlight">{pullRequest.title}</Body2P>
      <StretchedFlex>
        <PrStatusChip
          size="small"
          status={pullRequest.status}
        />
        <Button
          small
          as={Link}
          to={pullRequest.url}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
        >
          View PR
        </Button>
      </StretchedFlex>
    </PRCardSC>
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
  width: 304,
  marginLeft: theme.spacing.xsmall,
}))

const PR_CARD_GRADIENT =
  'linear-gradient(316deg, #E3A966 4.06%, #7751C7 34.47%, #747AF6 71.29%, #606ECD 98.54%)'

const PRCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.large,
  // gradient border styles
  backgroundImage: `linear-gradient(${theme.colors['fill-zero']}, ${theme.colors['fill-zero']}), ${PR_CARD_GRADIENT}`,
  backgroundClip: 'padding-box, border-box',
  backgroundOrigin: 'border-box',
  border: '1px solid transparent',
}))
