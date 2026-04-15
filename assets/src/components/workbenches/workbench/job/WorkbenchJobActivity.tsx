import {
  AccordionItem,
  Card,
  DiscoverIcon,
  FailedFilledIcon,
  Flex,
  IconFrame,
  LogsIcon,
  Markdown,
  TimeSeriesIcon,
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
import { Body2P, CaptionP, SpanSC } from 'components/utils/typography/Text'
import {
  useWorkbenchJobActivityQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ActivityModalIcon,
  JobActivityLogs,
  JobActivityMetrics,
  JobActivityPrompt,
  MemoActivityIcon,
  UserActivityResult,
} from './WorkbenchJobActivityResults'

export function WorkbenchJobActivity({
  isOpen,
  activity,
  textStream,
}: {
  isOpen: boolean
  activity: WorkbenchJobActivityFragment
  textStream: Nullable<string>
}) {
  const { spacing } = useTheme()
  const isRunning = isActivityRunning(activity.status)

  if (activity.type === WorkbenchJobActivityType.Conclusion)
    return (
      <div css={{ padding: `${spacing.small}px ${spacing.large}px 0 0` }}>
        <WorkbenchJobActivityResult
          activity={activity}
          markdownType="classic"
        />
      </div>
    )
  if (activity.type === WorkbenchJobActivityType.User)
    return <UserActivityResult activity={activity} />

  const { agentRun, result } = activity
  return (
    <AccordionItem
      key={activity.id}
      value={activity.id}
      caret="right-quarter-mirror"
      padding="none"
      triggerWrapperStyles={{
        justifyContent: 'flex-start',
        gap: 10,
        padding: `${spacing.xsmall}px 0`,
        '.icon': { width: 10 },
      }}
      trigger={
        <Flex
          gap="xsmall"
          alignItems="center"
        >
          <Body2P
            $color="text-long-form"
            $shimmer={isRunning}
            css={{ textTransform: 'capitalize' }}
          >
            {activity.type?.toLowerCase() ?? 'activity'}
          </Body2P>
          {activity.result?.jobUpdate && (
            <MemoActivityIcon jobUpdate={activity.result.jobUpdate} />
          )}
          {!isEmpty(result?.logs) && (
            <ActivityModalIcon
              icon={LogsIcon}
              tooltip="View logs"
              modalHeader="Logs"
              modalContent={
                <JobActivityLogs
                  logs={result?.logs?.filter(isNonNullable) ?? []}
                />
              }
            />
          )}
          {!isEmpty(result?.metrics) && (
            <ActivityModalIcon
              icon={TimeSeriesIcon}
              tooltip="View metrics"
              modalHeader="Metrics"
              modalContent={
                <JobActivityMetrics
                  metrics={result?.metrics?.filter(isNonNullable) ?? []}
                />
              }
            />
          )}
          {agentRun && (
            <IconFrame
              clickable
              as={Link}
              size="small"
              to={getAgentRunAbsPath({ agentRunId: agentRun.id })}
              target="_blank"
              rel="noopener noreferrer"
              icon={
                <DiscoverIcon
                  color="icon-xlight"
                  css={{ width: 12 }}
                />
              }
              tooltip="Go to agent run details"
            />
          )}
          {activity.status == WorkbenchJobActivityStatus.Failed && (
            <FailedFilledIcon
              size={12}
              color="icon-danger"
            />
          )}
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="xsmall"
        overflow="auto"
        css={{ padding: spacing.xsmall, paddingLeft: spacing.xlarge }}
      >
        {activity.prompt && activity.type !== WorkbenchJobActivityType.Memo && (
          <JobActivityPrompt prompt={activity.prompt} />
        )}
        <WorkbenchJobActivityThoughts
          activityId={activity.id}
          skip={!isOpen || activity.type === WorkbenchJobActivityType.Memo}
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
        <WorkbenchJobActivityResult activity={activity} />
      </Flex>
    </AccordionItem>
  )
}

function WorkbenchJobActivityResult({
  activity,
  markdownType = 'simplified',
}: {
  activity: WorkbenchJobActivityFragment
  markdownType?: 'classic' | 'simplified'
}) {
  const { agentRun, result } = activity
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
      <div>
        {markdownType === 'simplified' ? (
          <SimplifiedMarkdown text={result?.output ?? ''} />
        ) : (
          <Markdown text={result?.output ?? ''} />
        )}
      </div>
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

function WorkbenchJobActivityThoughts({
  activityId,
  skip,
}: {
  activityId: string
  skip: boolean
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  const { data, loading, error } = useWorkbenchJobActivityQuery({
    variables: { id: activityId },
    fetchPolicy: 'cache-and-network',
    skip,
    pollInterval: POLL_INTERVAL,
  })
  const thoughts =
    data?.workbenchJobActivity?.thoughts?.filter(isNonNullable) ?? []
  const isLoading = !data && loading

  const isExpandable = thoughts.length > 3
  const visibleThoughts = isExpanded ? thoughts : thoughts.slice(0, 3)
  if (isEmpty(thoughts) && !isLoading) return null

  return (
    <Flex
      direction="column"
      gap="small"
      paddingLeft={spacing.small}
    >
      {error && <GqlError error={error} />}
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
            {...(!isEmpty(metrics) && {
              customLabel: (
                <CaptionP $color="text">
                  Fetched metrics{' '}
                  <SpanSC $color="text-xlight">{toolName}</SpanSC>
                </CaptionP>
              ),
              customResultBody: (
                <Card>
                  <JobActivityMetrics
                    metrics={metrics}
                    lineProps={{
                      margin: { top: 20, right: 16, bottom: 25, left: 35 },
                    }}
                  />
                </Card>
              ),
            })}
            {...(!isEmpty(logs) && {
              customLabel: (
                <CaptionP $color="text">
                  Fetched logs <SpanSC $color="text-xlight">{toolName}</SpanSC>
                </CaptionP>
              ),
              customResultBody: (
                <Card css={{ height: '100%', overflow: 'auto' }}>
                  <JobActivityLogs logs={logs} />
                </Card>
              ),
            })}
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

export const isActivityRunning = (status: WorkbenchJobActivityStatus) =>
  status === WorkbenchJobActivityStatus.Pending ||
  status === WorkbenchJobActivityStatus.Running
