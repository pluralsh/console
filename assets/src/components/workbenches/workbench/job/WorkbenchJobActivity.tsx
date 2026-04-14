import { ApolloError } from '@apollo/client'
import {
  AccordionItem,
  BrainIcon,
  Card,
  ChecklistCheckedIcon,
  CheckOutlineIcon,
  CloudLoggingIcon,
  DiscoverIcon,
  FailedFilledIcon,
  Flex,
  IconFrame,
  IconProps,
  InfrastructureIcon,
  Markdown,
  NotebookIcon,
  SpinnerAlt,
  TicketIcon,
  ToolKitIcon,
  UnknownIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import { AgentRunInfoCard } from 'components/ai/agent-runs/AgentRunFixButton'
import {
  ClickableLabelSC,
  SimpleToolCall,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { POLL_INTERVAL } from 'components/cluster/constants'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { CaptionP, OverlineH3 } from 'components/utils/typography/Text'
import {
  useWorkbenchJobActivityQuery,
  WorkbenchJobActivityResultWithDataFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityTinyFragment,
  WorkbenchJobActivityType,
  WorkbenchJobThoughtFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentType, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityLogs,
  JobActivityMetrics,
  JobActivityPrompt,
  MemoActivityResult,
  UserActivityResult,
} from './WorkbenchJobActivityResults'

export function WorkbenchJobActivity({
  isOpen,
  activity,
  textStream,
}: {
  isOpen: boolean
  activity: WorkbenchJobActivityTinyFragment
  textStream: Nullable<string>
}) {
  const { spacing } = useTheme()
  const isRunning = isActivityRunning(activity.status)

  const { data, loading, error } = useWorkbenchJobActivityQuery({
    variables: { id: activity.id },
    fetchPolicy: 'cache-and-network',
    skip: !activity.id || !isOpen,
    pollInterval: POLL_INTERVAL,
  })

  const resultData = data?.workbenchJobActivity?.result
  const isLoading = !data && loading

  if (activity.type === WorkbenchJobActivityType.Conclusion)
    return (
      <WorkbenchJobActivityResult
        activity={activity}
        resultData={resultData}
        queryError={error}
        markdownType="classic"
      />
    )
  if (activity.type === WorkbenchJobActivityType.User)
    return <UserActivityResult activity={activity} />

  const TypeIcon =
    activityTypeToIcon[activity.type ?? WorkbenchJobActivityType.Integration]
  const { agentRun } = activity
  return (
    <AccordionItem
      key={activity.id}
      value={activity.id}
      caret="left"
      padding="compact"
      trigger={
        <StretchedFlex gap="small">
          <OverlineH3
            $color="text-primary-disabled"
            $shimmer={isRunning}
            css={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing.xsmall,
              marginRight: 'auto',
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
              target="_blank"
              rel="noopener noreferrer"
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
        {error && <GqlError error={error} />}
        {activity.prompt && activity.type !== WorkbenchJobActivityType.Memo && (
          <JobActivityPrompt prompt={activity.prompt} />
        )}
        <WorkbenchJobActivityThoughts
          thoughts={
            data?.workbenchJobActivity?.thoughts?.filter(isNonNullable) ?? []
          }
          isLoading={
            isLoading && activity.type !== WorkbenchJobActivityType.Memo
          }
        />
        {textStream && (
          <Flex
            direction="column"
            maxHeight={120}
            overflow="auto"
          >
            <SimplifiedMarkdown text={textStream} />
          </Flex>
        )}
        <WorkbenchJobActivityResult
          activity={activity}
          resultData={data?.workbenchJobActivity?.result}
        />
      </Flex>
    </AccordionItem>
  )
}

function WorkbenchJobActivityResult({
  activity,
  resultData,
  queryError,
  markdownType = 'simplified',
}: {
  activity: WorkbenchJobActivityTinyFragment
  resultData: Nullable<WorkbenchJobActivityResultWithDataFragment>
  queryError?: ApolloError
  markdownType?: 'classic' | 'simplified'
}) {
  const { type, agentRun, result } = activity
  switch (type) {
    case WorkbenchJobActivityType.Memo:
      return <MemoActivityResult result={result} />
    default:
      return (
        <Flex
          direction="column"
          gap="medium"
        >
          {result?.error && (
            <GqlError
              error={result.error}
              css={{ wordBreak: 'break-word' }}
            />
          )}
          {queryError && <GqlError error={queryError} />}
          <div>
            {markdownType === 'simplified' ? (
              <SimplifiedMarkdown text={result?.output ?? ''} />
            ) : (
              <Markdown text={result?.output ?? ''} />
            )}
          </div>
          <JobActivityMetrics
            metrics={resultData?.metrics?.filter(isNonNullable) ?? []}
          />
          <JobActivityLogs
            logs={resultData?.logs?.filter(isNonNullable) ?? []}
          />
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
  isLoading,
}: {
  thoughts: WorkbenchJobThoughtFragment[]
  isLoading: boolean
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const isExpandable = thoughts.length > 3
  const visibleThoughts = isExpanded ? thoughts : thoughts.slice(0, 3)
  if (isEmpty(thoughts) && !isLoading) return null

  return (
    <Flex
      direction="column"
      gap="small"
      paddingLeft={spacing.small}
    >
      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => <RectangleSkeleton key={i} />)}
      {visibleThoughts.map(({ toolName, toolArgs, content, attributes }, i) => {
        const metrics = attributes?.metrics?.filter(isNonNullable) ?? []
        const logs = attributes?.logs?.filter(isNonNullable) ?? []
        return (
          <SimpleToolCall
            key={i}
            content={content}
            attributes={{ tool: { name: toolName, arguments: toolArgs } }}
            customResultBody={
              !isEmpty(metrics) ? (
                <Card>
                  <JobActivityMetrics
                    metrics={metrics}
                    lineProps={{
                      margin: { top: 20, right: 16, bottom: 25, left: 35 },
                    }}
                  />
                </Card>
              ) : !isEmpty(logs) ? (
                <Card css={{ height: '100%', overflow: 'auto' }}>
                  <JobActivityLogs logs={logs} />
                </Card>
              ) : undefined
            }
          />
        )
      })}
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
  [WorkbenchJobActivityType.Conclusion]: CheckOutlineIcon,
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
