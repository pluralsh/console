import {
  AccordionItem,
  Card,
  DiscoverIcon,
  FailedFilledIcon,
  Flex,
  IconFrame,
  Markdown,
  TimeSeriesIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import {
  AgentRunInfoCard,
  AgentRunInfoSimple,
} from 'components/ai/agent-runs/AgentRunInfoDisplays'
import {
  SimpleAccordion,
  SimpleToolCall,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import pluralize from 'pluralize'
import { POLL_INTERVAL } from 'components/cluster/constants'
import { AILoadingText } from 'components/utils/AILoadingText'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { EaseIn } from 'components/utils/EaseIn'
import { Body2P, CaptionP, SpanSC } from 'components/utils/typography/Text'
import {
  useWorkbenchJobActivityQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobThoughtFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ActivityModalIcon,
  hasWorkbenchMetricsToolQuery,
  JobActivityLogs,
  JobActivityMetrics,
  JobActivityMetricsChart,
  JobActivityPrompt,
  MemoActivityIcon,
  UserActivityResult,
} from './WorkbenchJobActivityResults'

export function WorkbenchJobActivity({
  isOpen,
  activity,
  textStream,
  jobId,
}: {
  isOpen: boolean
  activity: WorkbenchJobActivityFragment
  textStream: Nullable<string>
  jobId: string
}) {
  const { spacing } = useTheme()
  const { id, status, type, prompt, agentRun, result } = activity
  const isRunning = isActivityRunning(status)

  if (type === WorkbenchJobActivityType.Conclusion)
    return (
      <div css={{ padding: `${spacing.small}px ${spacing.large}px 0 0` }}>
        <WorkbenchJobActivityResult
          activity={activity}
          jobId={jobId}
          markdownType="classic"
          metricsFetchEnabled
        />
      </div>
    )
  if (type === WorkbenchJobActivityType.User)
    return <UserActivityResult activity={activity} />

  return (
    <AccordionItem
      key={id}
      value={id}
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
            {type?.toLowerCase() ?? 'activity'}
          </Body2P>
          {result?.jobUpdate && (
            <MemoActivityIcon jobUpdate={result.jobUpdate} />
          )}
          {!isEmpty(result?.logs) && (
            <ActivityModalIcon
              icon={VisualInspectionIcon}
              tooltip="View logs"
              modalHeader="Logs"
              modalContent={
                <JobActivityLogs
                  cardWrapper
                  logs={result?.logs?.filter(isNonNullable) ?? []}
                />
              }
            />
          )}
          {hasWorkbenchMetricsToolQuery(result?.metricsQuery) && (
            <ActivityModalIcon
              icon={TimeSeriesIcon}
              tooltip="View metrics"
              modalHeader="Metrics"
              modalContent={
                <JobActivityMetrics
                  jobId={jobId}
                  metricsQuery={result?.metricsQuery}
                  skeletonHeight={320}
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
                  css={{ width: 14 }}
                />
              }
              tooltip="Go to agent run details"
            />
          )}
          {status == WorkbenchJobActivityStatus.Failed && (
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
        {prompt && type !== WorkbenchJobActivityType.Memo && (
          <JobActivityPrompt prompt={prompt} />
        )}
        <WorkbenchJobActivityThoughts
          activityId={id}
          skip={!isOpen || type === WorkbenchJobActivityType.Memo}
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
          jobId={jobId}
          metricsFetchEnabled={isOpen}
        />
        {isRunning && (
          <AILoadingText
            activityId={id}
            size="small"
          />
        )}
      </Flex>
    </AccordionItem>
  )
}

function WorkbenchJobActivityResult({
  activity,
  jobId,
  markdownType = 'simplified',
  metricsFetchEnabled,
}: {
  activity: WorkbenchJobActivityFragment
  jobId: string
  markdownType?: 'classic' | 'simplified'
  metricsFetchEnabled: boolean
}) {
  const { spacing } = useTheme()
  const { agentRun, agentRuns, result } = activity
  const otherAgentRuns = useMemo(
    () =>
      agentRuns?.filter(isNonNullable).filter(({ id }) => id !== agentRun?.id),
    [agentRun?.id, agentRuns]
  )
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
        jobId={jobId}
        fetchWhen={metricsFetchEnabled}
        metricsQuery={result?.metricsQuery}
      />
      <JobActivityLogs logs={result?.logs?.filter(isNonNullable) ?? []} />
      {!isEmpty(otherAgentRuns) && (
        <>
          <StackedText
            first="Other agent runs"
            firstPartialType="body2Bold"
            firstColor="text-xlight"
            icon={
              <DiscoverIcon
                size={12}
                color="icon-xlight"
              />
            }
          />
          {otherAgentRuns?.map((agentRun) => (
            <AgentRunInfoSimple
              key={agentRun.id}
              agentRun={agentRun}
              css={{ padding: `0 ${spacing.small}px` }}
            />
          ))}
        </>
      )}
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
  const isLoading = !data && loading
  const activity = data?.workbenchJobActivity

  const { thoughts, lastThought, header } = useMemo(() => {
    const thoughts = activity?.thoughts?.filter(isNonNullable) ?? []
    let [numWithLogs, numWithMetrics] = [0, 0]
    thoughts.forEach(({ attributes }) => {
      numWithLogs += isEmpty(attributes?.logs) ? 0 : 1
      numWithMetrics += isEmpty(attributes?.metrics) ? 0 : 1
    })
    const numOtherToolCalls = thoughts.length - numWithLogs - numWithMetrics
    let header = `${numOtherToolCalls} tool ${pluralize('call', numOtherToolCalls)}`
    if (numWithLogs > 0) header += `, ${numWithLogs} fetched logs`
    if (numWithMetrics > 0) header += `, ${numWithMetrics} fetched metrics`
    return { thoughts, lastThought: thoughts.at(-1), header }
  }, [activity?.thoughts])

  if (isEmpty(thoughts) && !isLoading) return null
  if (error)
    return (
      <GqlError
        header={
          <Body2P $color="text-xlight">Failed to load activity thoughts</Body2P>
        }
        error={error}
      />
    )

  return (
    <>
      <SimpleAccordion
        label={header}
        loading={isLoading}
        isOpen={isExpanded}
        setIsOpen={setIsExpanded}
        caret="right-quarter-mirror"
        triggerWrapperStyles={{
          justifyContent: 'flex-start',
          '.icon': { width: 10 },
        }}
      >
        <Flex
          direction="column"
          gap="xsmall"
          marginTop={spacing.xsmall}
        >
          {thoughts.map((thought, i) => (
            <WorkbenchJobActivityThought
              key={i}
              thought={thought}
            />
          ))}
        </Flex>
      </SimpleAccordion>
      {!isExpanded && lastThought && isActivityRunning(activity?.status) && (
        <EaseIn currentKey={lastThought.id}>
          <WorkbenchJobActivityThought thought={lastThought} />
        </EaseIn>
      )}
    </>
  )
}

function WorkbenchJobActivityThought({
  thought,
}: {
  thought: WorkbenchJobThoughtFragment
}) {
  const { content, toolName, toolArgs, attributes } = thought
  const metrics = attributes?.metrics?.filter(isNonNullable) ?? []
  const logs = attributes?.logs?.filter(isNonNullable) ?? []
  return (
    <SimpleToolCall
      content={content}
      attributes={{ tool: { name: toolName, arguments: toolArgs } }}
      {...(!isEmpty(metrics) && {
        customLabel: (
          <CaptionP $color="text">
            Fetched metrics <SpanSC $color="text-xlight">{toolName}</SpanSC>
          </CaptionP>
        ),
        customResultBody: (
          <Card>
            <JobActivityMetricsChart
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
          <JobActivityLogs
            cardWrapper
            logs={logs}
          />
        ),
      })}
    />
  )
}

export const isActivityRunning = (
  status: Nullable<WorkbenchJobActivityStatus>
) =>
  status === WorkbenchJobActivityStatus.Pending ||
  status === WorkbenchJobActivityStatus.Running
