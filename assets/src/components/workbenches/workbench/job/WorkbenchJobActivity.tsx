import {
  AccordionItem,
  BrainIcon,
  ChecklistCheckedIcon,
  CheckOutlineIcon,
  CloudLoggingIcon,
  DiscoverIcon,
  FailedFilledIcon,
  Flex,
  IconFrame,
  IconProps,
  InfrastructureIcon,
  NotebookIcon,
  SpinnerAlt,
  TicketIcon,
  ToolKitIcon,
  UnknownIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import {
  ClickableLabelSC,
  SimpleToolCall,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2P, CaptionP, OverlineH3 } from 'components/utils/typography/Text'
import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobProgressFragment,
  WorkbenchJobThoughtFragment,
} from 'generated/graphql'
import { ComponentType, useState } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityLogs,
  JobActivityMetrics,
  JobActivityPrompt,
  MemoActivityResult,
} from './WorkbenchJobActivityResults'
import { GqlError } from 'components/utils/Alert'
import { isEmpty } from 'lodash'
import { AgentRunInfoCard } from 'components/ai/agent-runs/AgentRunFixButton'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'

export function WorkbenchJobActivity({
  isOpen,
  activity,
  progress,
}: {
  isOpen: boolean
  activity: WorkbenchJobActivityFragment
  progress: WorkbenchJobProgressFragment[]
}) {
  const { spacing } = useTheme()
  const isRunning = isActivityRunning(activity.status)
  const TypeIcon =
    activityTypeToIcon[activity.type ?? WorkbenchJobActivityType.Integration]
  const { agentRun } = activity
  return (
    <AccordionItem
      key={activity.id}
      value={activity.id}
      caret="left"
      padding="compact"
      paddingArea="trigger-only"
      trigger={
        <StretchedFlex gap="small">
          <OverlineH3
            $color="text-primary-disabled"
            $shimmer={isRunning}
            css={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing.xsmall,
              flex: 1,
            }}
          >
            <TypeIcon
              size={12}
              color="icon-xlight"
            />
            <span>{activity.type?.toLowerCase() ?? 'activity'}</span>
          </OverlineH3>
          {agentRun && !isOpen && (
            <IconFrame
              clickable
              as={Link}
              to={getAgentRunAbsPath({ agentRunId: agentRun.id })}
              icon={<DiscoverIcon color="icon-xlight" />}
              tooltip="Go to agent run details"
            />
          )}
          <ActivityStatusIcon status={activity.status} />
        </StretchedFlex>
      }
    >
      <Flex
        direction="column"
        gap="xsmall"
        overflow="auto"
        css={{ padding: spacing.xsmall, paddingLeft: spacing.xlarge }}
      >
        {/* TODO */}
        {progress.map((p, i) => (
          <Body2P key={i}>{p.text}</Body2P>
        ))}
        {activity.prompt && activity.type !== WorkbenchJobActivityType.Memo && (
          <JobActivityPrompt prompt={activity.prompt} />
        )}
        <WorkbenchJobActivityThoughts
          thoughts={activity.thoughts?.filter(isNonNullable) ?? []}
        />
        <WorkbenchJobActivityResult activity={activity} />
      </Flex>
    </AccordionItem>
  )
}

function WorkbenchJobActivityResult({
  activity,
}: {
  activity: WorkbenchJobActivityFragment
}) {
  const { type, result, agentRun } = activity
  switch (type) {
    case WorkbenchJobActivityType.Memo:
      return <MemoActivityResult result={result} />
    default:
      return (
        <Flex
          direction="column"
          gap="medium"
        >
          {result?.error && <GqlError error={result.error} />}
          <SimplifiedMarkdown text={result?.output ?? ''} />
          <JobActivityMetrics
            metrics={result?.metrics?.filter(isNonNullable) ?? []}
          />
          <JobActivityLogs logs={result?.logs?.filter(isNonNullable) ?? []} />
          <AgentRunInfoCard
            showLinkButton
            fillLevel={1}
            agentRun={agentRun}
          />
        </Flex>
      )
  }
}

function WorkbenchJobActivityThoughts({
  thoughts,
}: {
  thoughts: WorkbenchJobThoughtFragment[]
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const isExpandable = thoughts.length > 3
  const visibleThoughts = isExpanded ? thoughts : thoughts.slice(0, 3)
  if (isEmpty(thoughts)) return null
  return (
    <Flex
      direction="column"
      gap="small"
      paddingLeft={spacing.small}
    >
      {visibleThoughts.map((t, i) => (
        <SimpleToolCall
          key={i}
          content={t.content}
          attributes={{ tool: { name: t.toolName, arguments: t.toolArgs } }}
        />
      ))}
      {isExpandable && (
        <ClickableLabelSC onClick={() => setIsExpanded(!isExpanded)}>
          <CaptionP $color="text-xlight">
            {isExpanded
              ? 'View less'
              : `View more +${thoughts.length - visibleThoughts.length}`}
          </CaptionP>
        </ClickableLabelSC>
      )}
    </Flex>
  )
}

const activityTypeToIcon: Record<
  WorkbenchJobActivityType,
  ComponentType<IconProps>
> = {
  [WorkbenchJobActivityType.Coding]: CloudLoggingIcon,
  [WorkbenchJobActivityType.Infrastructure]: InfrastructureIcon,
  [WorkbenchJobActivityType.Memo]: NotebookIcon,
  [WorkbenchJobActivityType.Observability]: VisualInspectionIcon,
  [WorkbenchJobActivityType.Plan]: ChecklistCheckedIcon,
  [WorkbenchJobActivityType.Ticketing]: TicketIcon,
  [WorkbenchJobActivityType.Integration]: ToolKitIcon,
  [WorkbenchJobActivityType.Memory]: BrainIcon,
  [WorkbenchJobActivityType.User]: BrainIcon,
} as const satisfies Record<WorkbenchJobActivityType, ComponentType<IconProps>>

function ActivityStatusIcon({
  status,
}: {
  status: WorkbenchJobActivityStatus
}) {
  switch (status) {
    case WorkbenchJobActivityStatus.Pending:
    case WorkbenchJobActivityStatus.Running:
      return <SpinnerAlt size={12} />
    case WorkbenchJobActivityStatus.Successful:
      return (
        <CheckOutlineIcon
          size={12}
          color="icon-success"
        />
      )
    case WorkbenchJobActivityStatus.Failed:
      return (
        <FailedFilledIcon
          size={12}
          color="icon-danger"
        />
      )
    default:
      return (
        <UnknownIcon
          size={12}
          color="icon-xlight"
        />
      )
  }
}

export const isActivityRunning = (status: WorkbenchJobActivityStatus) =>
  status === WorkbenchJobActivityStatus.Pending ||
  status === WorkbenchJobActivityStatus.Running
