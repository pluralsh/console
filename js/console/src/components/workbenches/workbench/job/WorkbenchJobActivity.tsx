import {
  AccordionItem,
  AgentLoadingIcon,
  CaretDownIcon,
  DiffMethod,
  DiffViewer,
  FailedFilledIcon,
  Flex,
  IconFrame,
  TimeSeriesIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import {
  AgentRunIcon,
  AgentRunInfoCard,
  AgentRunInfoSimple,
} from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { ChatMarkdown } from 'components/ai/chatbot/ChatMarkdown'
import {
  SimpleAccordion,
  SimpleToolCall,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import {
  getSearchQuery,
  toolCallTitle,
  resolveToolCallKind,
  toolCallGroupHeader,
} from 'components/ai/chatbot/toolCallDisplay'
import { ToolCallKindIcon } from 'components/ai/chatbot/toolCallIcons'
import { PreviewablePanel } from 'components/ai/chatbot/ToolCallContent'
import {
  getWorkbenchToolLabel,
  WorkbenchToolIcon,
} from 'components/workbenches/tools/workbenchToolsUtils'
import pluralize from 'pluralize'
import { POLL_INTERVAL } from 'components/cluster/constants'
import { AILoadingText } from 'components/utils/AILoadingText'
import { GqlError } from 'components/utils/Alert'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { StackedText } from 'components/utils/table/StackedText'
import { EaseIn } from 'components/utils/EaseIn'
import {
  Body2BoldP,
  Body2P,
  shimmerWithinCss,
} from 'components/utils/typography/Text'
import {
  AgentRunStatus,
  useWorkbenchJobActivityQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobProgressFragment,
  WorkbenchJobStatus,
  WorkbenchJobThoughtFragment,
  WorkbenchToolTinyFragment,
} from 'generated/graphql'
import { isEmpty, startCase } from 'lodash'
import { type ReactNode, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { getOldContentFromTextDiff } from 'utils/textDiff'
import {
  ActivityModalIcon,
  hasWorkbenchMetricsToolQuery,
  JobActivityLogs,
  JobActivityMetrics,
  ExpandableJobActivityMetrics,
  JobActivityPrompt,
  JobActivityTraces,
  MemoActivityIcon,
  ExpandableUserPrompt,
} from './WorkbenchJobActivityResults'
import { getMetricSeries } from './workbenchJobMetrics'
import { WorkbenchJobCanvas } from './WorkbenchJobCanvas'
import { WorkbenchJobInlineActionCard } from './WorkbenchJobInlineActionCard'

export function WorkbenchJobActivity({
  isOpen,
  activity,
  textStream,
  latestThought,
  jobId,
  workbenchId,
  workbenchName,
}: {
  isOpen: boolean
  activity: WorkbenchJobActivityFragment
  textStream: Nullable<string>
  latestThought?: Nullable<WorkbenchJobThoughtFragment>
  jobId: string
  workbenchId: string
  workbenchName: string
}) {
  const theme = useTheme()
  const { spacing } = theme
  const { id, status, type, prompt, agentRun, result } = activity
  const isRunning = isJobRunning(status)

  if (
    type === WorkbenchJobActivityType.Function ||
    type === WorkbenchJobActivityType.Kubernetes ||
    type === WorkbenchJobActivityType.Exec
  )
    return <WorkbenchJobInlineActionCard activity={activity} />

  if (type === WorkbenchJobActivityType.Conclusion)
    return (
      <div
        css={{
          padding: `${spacing.small}px ${spacing.medium}px 0 0`,
        }}
      >
        <WorkbenchJobActivityResult
          activity={activity}
          jobId={jobId}
          markdownType="classic"
          metricsFetchEnabled
        />
      </div>
    )
  if (type === WorkbenchJobActivityType.User)
    return (
      <ExpandableUserPrompt
        prompt={activity.prompt}
        timestamp={activity.insertedAt}
      />
    )

  const typeLabel = workbenchActivityTitle(type)
  const activitySummary = workbenchActivitySummary({
    isRunning,
    prompt,
    output: result?.output,
    error: result?.error,
  })
  const trailingIcons = (
    <>
      {result?.jobUpdate && <MemoActivityIcon jobUpdate={result.jobUpdate} />}
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
          to={getAgentRunAbsPath({
            agentRunId: agentRun.id,
            ...(workbenchId
              ? {
                  backTo: getWorkbenchJobAbsPath({ workbenchId, jobId }),
                  backLabel: workbenchName,
                }
              : {}),
          })}
          target="_blank"
          rel="noopener noreferrer"
          icon={
            <AgentRunIcon
              runtime={agentRun.runtime}
              size={14}
              fullColor={false}
              color="icon-light"
            />
          }
          tooltip="Go to agent run details"
        />
      )}
    </>
  )

  return (
    <AccordionItem
      key={id}
      value={id}
      caret="none"
      padding="none"
      triggerWrapperStyles={{
        justifyContent: 'flex-start',
        gap: 10,
        padding: `${spacing.xxsmall}px 0`,
        width: 'fit-content',
        maxWidth: '100%',
      }}
      trigger={
        <ActivityHeaderSC $hasStatusIcon={isRunning}>
          <ActivityTitleRowSC>
            <ActivityStatusIcon status={status} />
            <Flex
              gap="xsmall"
              alignItems="center"
              minWidth={0}
              css={{ flex: '0 1 auto', maxWidth: '100%' }}
            >
              <Body2BoldP
                as="span"
                className="type"
                $color="text-xlight"
                $shimmer={isRunning}
              >
                {typeLabel}
              </Body2BoldP>
              {trailingIcons}
              {isRunning && !agentRun && latestThought && (
                <ActivityLatestTool thought={latestThought} />
              )}
            </Flex>
            <ActivityCaretSC
              $isOpen={isOpen}
              size={10}
            />
          </ActivityTitleRowSC>
          {!isOpen && activitySummary && (
            <Body2P
              as="span"
              className="summary"
              $color={isRunning ? 'text-xlight' : 'text-disabled'}
              $shimmer={isRunning}
            >
              {activitySummary}
            </Body2P>
          )}
        </ActivityHeaderSC>
      }
    >
      <Flex
        direction="column"
        gap="large"
      >
        {prompt && (
          <JobActivityPrompt
            prompt={prompt}
            shimmer={isRunning}
          />
        )}
        <WorkbenchJobActivityThoughts
          activityId={id}
          skip={!isOpen}
        />
        {textStream && (
          <Flex
            direction="column"
            maxHeight={120}
            overflow="auto"
            css={isRunning ? shimmerWithinCss(theme) : undefined}
          >
            <SimplifiedMarkdown
              text={textStream}
              tone="thought"
            />
          </Flex>
        )}
        <WorkbenchJobActivityResult
          activity={activity}
          jobId={jobId}
          metricsFetchEnabled={isOpen}
        />
        {isRunning && <AILoadingText activityId={id} />}
      </Flex>
    </AccordionItem>
  )
}

export function WorkbenchJobMemoGroup({
  activities,
  textStreamMap,
}: {
  activities: WorkbenchJobActivityFragment[]
  textStreamMap: Record<string, string>
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const lastMemo = activities.at(-1)
  const shouldGroup = activities.length >= 3

  if (!shouldGroup)
    return (
      <MemoGroupSC>
        <Flex
          direction="column"
          gap="xsmall"
        >
          {activities.map((activity) => (
            <WorkbenchJobMemo
              key={activity.id}
              activity={activity}
              textStream={textStreamMap[activity.id] ?? ''}
            />
          ))}
        </Flex>
      </MemoGroupSC>
    )

  return (
    <MemoGroupSC>
      <SimpleAccordion
        label={`${activities.length} memos`}
        isOpen={isExpanded}
        setIsOpen={setIsExpanded}
        hoverCaret
      >
        <Flex
          direction="column"
          gap="xsmall"
          marginTop={spacing.xsmall}
        >
          {activities.map((activity) => (
            <WorkbenchJobMemo
              key={activity.id}
              activity={activity}
              textStream={textStreamMap[activity.id] ?? ''}
            />
          ))}
        </Flex>
      </SimpleAccordion>
      {!isExpanded && lastMemo && isJobRunning(lastMemo.status) && (
        <EaseIn currentKey={lastMemo.id}>
          <WorkbenchJobMemo
            activity={lastMemo}
            textStream={textStreamMap[lastMemo.id] ?? ''}
          />
        </EaseIn>
      )}
    </MemoGroupSC>
  )
}

function WorkbenchJobMemo({
  activity,
  textStream,
}: {
  activity: WorkbenchJobActivityFragment
  textStream: string
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const isRunning = isJobRunning(activity.status)
  const isFailed = activity.status === WorkbenchJobActivityStatus.Failed
  const isRejected = activity.status === WorkbenchJobActivityStatus.Rejected
  const { prompt, result } = activity
  const summary = textStream || result?.output || prompt || ''
  const workingTheory =
    result?.jobUpdate?.workingTheory?.trim() ||
    result?.jobUpdate?.conclusion?.trim() ||
    ''
  // Prefer the longer working-theory/conclusion body over the short memo summary.
  const fullText = workingTheory || summary
  const label =
    summary ||
    workingTheory ||
    result?.error ||
    (isRejected ? 'Rejected workbench notes update' : null) ||
    (isFailed ? 'Failed to update workbench notes' : 'Updated workbench notes')

  const jobUpdate = result?.jobUpdate
  const newValue = jobUpdate?.workingTheory ?? jobUpdate?.conclusion ?? ''
  const oldValue = useMemo(
    () => getOldContentFromTextDiff(newValue, jobUpdate?.diff),
    [newValue, jobUpdate?.diff]
  )
  const hasDiff = !!jobUpdate?.diff

  return (
    <SimpleAccordion
      hoverCaret
      isOpen={isExpanded}
      setIsOpen={setIsExpanded}
      triggerWrapperStyles={{
        justifyContent: 'flex-start',
        width: 'fit-content',
        maxWidth: '100%',
      }}
      label={
        <Flex
          alignItems="center"
          gap="xsmall"
          minWidth={0}
        >
          <MemoLabelSC $shimmer={isRunning}>{label}</MemoLabelSC>
          {(isFailed || isRejected) && (
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
        gap="small"
        marginTop={spacing.xsmall}
        minWidth={0}
      >
        {result?.error && (
          <GqlError
            error={result.error}
            css={{ wordBreak: 'break-word' }}
          />
        )}
        {fullText && (
          <SimplifiedMarkdown
            text={fullText}
            tone="thought"
          />
        )}
        {hasDiff && (
          <DiffViewer
            compareMethod={DiffMethod.WORDS}
            oldValue={oldValue}
            newValue={newValue}
          />
        )}
      </Flex>
    </SimpleAccordion>
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
  const { id, agentRun, agentRuns, result } = activity
  const otherAgentRuns = useMemo(
    () =>
      agentRuns?.filter(isNonNullable).filter(({ id }) => id !== agentRun?.id),
    [agentRun?.id, agentRuns]
  )
  const hasCanvasBlocks = !isEmpty((result?.canvas ?? []).filter(isNonNullable))
  return (
    <Flex
      direction="column"
      gap="small"
    >
      {result?.error && (
        <GqlError
          error={result.error}
          css={{ wordBreak: 'break-word' }}
        />
      )}
      {!hasCanvasBlocks && (
        <div>
          {markdownType === 'simplified' ? (
            <SimplifiedMarkdown
              text={result?.output ?? ''}
              tone="major"
            />
          ) : (
            <ChatMarkdown text={result?.output ?? ''} />
          )}
        </div>
      )}
      <WorkbenchJobCanvas
        jobId={jobId}
        activityId={id}
        canvas={result?.canvas}
      />
      <JobActivityMetrics
        jobId={jobId}
        fetchWhen={metricsFetchEnabled}
        metricsQuery={result?.metricsQuery}
      />
      <JobActivityTraces
        jobId={jobId}
        fetchWhen={metricsFetchEnabled}
        traces={result?.traces}
        tracesQuery={result?.tracesQuery}
      />
      <JobActivityLogs logs={result?.logs?.filter(isNonNullable) ?? []} />
      {!isEmpty(otherAgentRuns) && (
        <>
          <StackedText
            first="Other agent runs"
            firstPartialType="body2Bold"
            firstColor="text-xlight"
            icon={<AgentRunIcon size={12} />}
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

const MemoGroupSC = styled.div(({ theme }) => ({
  width: '100%',
  minWidth: 0,
  borderRadius: theme.borderRadiuses.medium,
}))

const MemoLabelSC = styled(Body2P)(({ theme }) => ({
  color: theme.colors['text-xlight'],
  display: 'block',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

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
  const shimmer = isJobRunning(activity?.status)

  const { thoughts, lastThought, header } = useMemo(() => {
    const thoughts = activity?.thoughts?.filter(isNonNullable) ?? []
    let [numWithLogs, numWithMetrics] = [0, 0]
    const configuredToolCounts = new Map<
      string,
      { count: number; tool: WorkbenchToolTinyFragment }
    >()
    const otherThoughts: Array<{
      name?: string | null
      arguments?: WorkbenchJobThoughtFragment['toolArgs']
    }> = []
    thoughts.forEach((thought) => {
      if (thought.tool) {
        const toolKey = `${thought.tool.tool}:${thought.tool.cloudConnection?.provider ?? ''}`
        const current = configuredToolCounts.get(toolKey)
        configuredToolCounts.set(toolKey, {
          count: (current?.count ?? 0) + 1,
          tool: thought.tool,
        })
      } else if (!isEmpty(thought.attributes?.logs)) numWithLogs += 1
      else if (!isEmpty(thought.attributes?.metrics)) numWithMetrics += 1
      else {
        otherThoughts.push({
          name: thought.toolName,
          arguments: thought.toolArgs,
        })
      }
    })
    const textParts = [
      toolCallGroupHeader(otherThoughts),
      numWithLogs > 0 &&
        `${numWithLogs} fetch ${pluralize('log', numWithLogs)}`,
      numWithMetrics > 0 &&
        `${numWithMetrics} fetch ${pluralize('metric', numWithMetrics)}`,
    ].filter((part): part is string => !!part)
    const toolCounts = [...configuredToolCounts.values()]
    return {
      thoughts,
      lastThought: thoughts.at(-1),
      header:
        toolCounts.length > 0 ? (
          <WorkbenchToolCallSummary
            toolCounts={toolCounts}
            textParts={textParts}
            shimmer={shimmer}
          />
        ) : (
          <Body2P
            as="span"
            $color="text-xlight"
            $shimmer={shimmer}
          >
            {textParts.join(', ') ||
              `${thoughts.length} tool ${pluralize('call', thoughts.length)}`}
          </Body2P>
        ),
    }
  }, [activity?.thoughts, shimmer])

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
        hoverCaret
      >
        <Flex
          direction="column"
          gap="small"
          marginTop={spacing.medium}
        >
          {thoughts.map((thought, i) => (
            <WorkbenchJobActivityThought
              key={i}
              thought={thought}
              shimmer={shimmer}
            />
          ))}
        </Flex>
      </SimpleAccordion>
      {!isExpanded && lastThought && isJobRunning(activity?.status) && (
        <EaseIn currentKey={lastThought.id}>
          <WorkbenchJobActivityThought
            thought={lastThought}
            shimmer={shimmer}
          />
        </EaseIn>
      )}
    </>
  )
}

function WorkbenchJobActivityThought({
  thought,
  shimmer = false,
}: {
  thought: WorkbenchJobThoughtFragment
  shimmer?: boolean
}) {
  const { id, content, toolName, toolArgs, attributes, tool } = thought
  const metrics = attributes?.metrics?.filter(isNonNullable) ?? []
  const logs = attributes?.logs?.filter(isNonNullable) ?? []
  const query = getSearchQuery(toolArgs)
  const toolIcon = thoughtToolIcon({ tool, toolName, toolArgs })
  const title =
    toolName || tool ? workbenchToolCallTitle(toolName, tool) : undefined
  const blankResult = isBlankToolPayload(content)
  const isMetricsFetch = !isEmpty(metrics) || title === 'fetch metrics'
  const metricSeriesCount = isMetricsFetch
    ? getMetricSeries(metrics).length
    : undefined
  const noLogs = title === 'fetch logs' && isEmpty(logs) && blankResult
  return (
    <SimpleToolCall
      content={content}
      attributes={{ tool: { name: toolName, arguments: toolArgs } }}
      customTitle={title}
      leadingIcon={toolIcon}
      shimmer={shimmer}
      {...(metricSeriesCount != null && {
        customLabel: (
          <WorkbenchObservabilityToolLabel
            icon={toolIcon}
            title={`fetch metrics (${metricSeriesCount})`}
            query={query}
            shimmer={shimmer}
          />
        ),
        ...(metricSeriesCount > 0 && {
          customResultBody: <ExpandableJobActivityMetrics metrics={metrics} />,
        }),
      })}
      {...(noLogs
        ? {
            customLabel: (
              <WorkbenchObservabilityToolLabel
                icon={toolIcon}
                title="no logs"
                query={query}
                shimmer={shimmer}
              />
            ),
            customResultBody: <EmptyToolResult message="No logs" />,
          }
        : !isEmpty(logs) && {
            customLabel: (
              <WorkbenchObservabilityToolLabel
                icon={toolIcon}
                title={title ?? 'fetch logs'}
                query={query}
                shimmer={shimmer}
              />
            ),
            customResultBody: (
              <PreviewablePanel
                contentKey={`logs:${id}:${logs.length}`}
                subtle
                shimmer={shimmer}
              >
                <JobActivityLogs logs={logs} />
              </PreviewablePanel>
            ),
          })}
    />
  )
}

function EmptyToolResult({ message }: { message: string }) {
  return (
    <PreviewablePanel
      contentKey={message}
      subtle
      unclamped
    >
      <Body2P
        as="span"
        $color="text-disabled"
        css={{ fontStyle: 'italic' }}
      >
        {message}
      </Body2P>
    </PreviewablePanel>
  )
}

function isBlankToolPayload(content?: string | null) {
  const text = content?.trim() ?? ''
  if (!text) return true

  try {
    return isBlankValue(JSON.parse(text))
  } catch {
    return false
  }
}

function isBlankValue(value: unknown): boolean {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.every(isBlankValue)
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isBlankValue)
  }

  return false
}

function WorkbenchObservabilityToolLabel({
  icon,
  title,
  query,
  shimmer = false,
}: {
  icon?: ReactNode
  title: string
  query: string
  shimmer?: boolean
}) {
  return (
    <Flex
      align="center"
      gap="xsmall"
      minWidth={0}
      css={{ maxWidth: '100%', overflow: 'hidden' }}
    >
      {icon}
      <Body2P
        as="span"
        $color="text-xlight"
        $shimmer={shimmer}
        css={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {title}
      </Body2P>
      {query && (
        <Body2P
          as="span"
          $color="text-disabled"
          $shimmer={shimmer}
          css={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {query}
        </Body2P>
      )}
    </Flex>
  )
}

function WorkbenchToolCallSummary({
  toolCounts,
  textParts,
  shimmer = false,
}: {
  toolCounts: Array<{ count: number; tool: WorkbenchToolTinyFragment }>
  textParts: string[]
  shimmer?: boolean
}) {
  const { spacing } = useTheme()

  return (
    <span
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {textParts.map((part, index) => (
        <Body2P
          key={part}
          as="span"
          $color="text-xlight"
          $shimmer={shimmer}
          css={{
            display: 'inline-flex',
            alignItems: 'center',
            ...(index > 0 && {
              '&::before': {
                content: "','",
                marginRight: spacing.xsmall,
              },
            }),
          }}
        >
          {part}
        </Body2P>
      ))}
      {toolCounts.map(({ count, tool }, index) => (
        <span
          key={tool.id}
          title={`${count} ${getWorkbenchToolLabel(
            tool.tool,
            tool.cloudConnection?.provider
          )} tool ${pluralize('call', count)}`}
          css={{
            display: 'inline-flex',
            alignItems: 'center',
            ...((textParts.length > 0 || index > 0) && {
              '&::before': {
                content: "','",
                marginRight: spacing.xsmall,
              },
            }),
          }}
        >
          <Body2P
            as="span"
            $color="text-xlight"
            $shimmer={shimmer}
            css={{ marginRight: spacing.xxsmall }}
          >
            {count}
          </Body2P>
          <Body2P
            as="span"
            $color="text-xlight"
            $shimmer={shimmer}
          >
            {getWorkbenchToolLabel(tool.tool, tool.cloudConnection?.provider)}
          </Body2P>
          <WorkbenchToolIcon
            type={tool.tool}
            provider={tool.cloudConnection?.provider}
            size={14}
            css={{ marginLeft: spacing.xxsmall }}
          />
        </span>
      ))}
    </span>
  )
}

function ActivityLatestTool({
  thought,
}: {
  thought: WorkbenchJobThoughtFragment
}) {
  const { toolName, toolArgs, tool } = thought
  if (!toolName && !tool) return null

  const title = workbenchToolCallTitle(toolName, tool)

  return (
    <ActivityLatestToolSC title={title}>
      {thoughtToolIcon({ tool, toolName, toolArgs })}
      <Body2P
        as="span"
        $color="text-disabled"
        $shimmer
        css={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Body2P>
    </ActivityLatestToolSC>
  )
}

const ActivityLatestToolSC = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
  maxWidth: '40ch',
  flex: '0 1 auto',
}))

function thoughtToolIcon({
  tool,
  toolName,
  toolArgs,
}: {
  tool?: Nullable<WorkbenchToolTinyFragment>
  toolName?: Nullable<string>
  toolArgs?: WorkbenchJobThoughtFragment['toolArgs']
}) {
  if (tool) {
    return (
      <WorkbenchToolIcon
        type={tool.tool}
        provider={tool.cloudConnection?.provider}
        size={14}
        css={{ flexShrink: 0 }}
      />
    )
  }

  return (
    <ToolCallKindIcon kind={resolveToolCallKind(toolName ?? '', toolArgs)} />
  )
}

function workbenchToolCallTitle(
  toolName: Nullable<string>,
  tool?: Nullable<WorkbenchToolTinyFragment>
): string {
  const toolLabel = tool
    ? getWorkbenchToolLabel(tool.tool, tool.cloudConnection?.provider)
    : undefined

  return toolCallTitle({
    name: toolName,
    hiddenWords: tool
      ? [toolLabel, startCase(tool.tool.replace(/_/g, ' ')), tool.name, 'gh']
      : [],
  })
}

/**
 * Job-level status at the bottom of the transcript. "Thinking" and
 * "Planning next moves" share one line so the change slides upward
 * like a tool call, instead of swapping the whole block.
 */
export function WorkbenchJobJobLevelThinking({
  items,
  jobRunning,
  planning = false,
  jobId,
}: {
  items: Array<WorkbenchJobProgressFragment & { localKey: number }>
  jobRunning: boolean
  planning?: boolean
  jobId?: string
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const last = items.at(-1)
  const showThinking = !planning && items.length > 0

  if (!showThinking && !planning) return null

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <EaseIn currentKey={showThinking ? 'thinking' : 'planning'}>
        {showThinking ? (
          <SimpleAccordion
            label={
              <Body2P
                as="span"
                $color="text-xlight"
                $shimmer={jobRunning}
              >
                Thinking
              </Body2P>
            }
            loading={false}
            isOpen={isExpanded}
            setIsOpen={setIsExpanded}
            hoverCaret
          >
            <Flex
              direction="column"
              gap="small"
              marginTop={spacing.xsmall}
            >
              {items.map((item) => (
                <WorkbenchJobLevelThinkingCall
                  key={item.localKey}
                  item={item}
                />
              ))}
            </Flex>
          </SimpleAccordion>
        ) : (
          <AILoadingText jobId={jobId} />
        )}
      </EaseIn>
      {showThinking && !isExpanded && last && jobRunning && (
        <EaseIn currentKey={last.localKey}>
          <WorkbenchJobLevelThinkingCall item={last} />
        </EaseIn>
      )}
    </Flex>
  )
}

function WorkbenchJobLevelThinkingCall({
  item,
}: {
  item: WorkbenchJobProgressFragment
}) {
  const { text, tool, arguments: toolArgs } = item
  return (
    <SimpleToolCall
      content={text ?? ''}
      attributes={{
        tool: { name: tool ?? '', arguments: toolArgs ?? {} },
      }}
      isPending
    />
  )
}

export const isJobRunning = (
  status: Nullable<
    WorkbenchJobActivityStatus | WorkbenchJobStatus | AgentRunStatus
  >
) => status === 'PENDING' || status === 'RUNNING'

const ACTIVITY_STATUS_ICON_SIZE = 10

function ActivityStatusIcon({
  status,
}: {
  status: WorkbenchJobActivityStatus
}) {
  if (!isJobRunning(status)) return null

  return (
    <ActivityStatusIconSC>
      <AgentLoadingIcon
        size={ACTIVITY_STATUS_ICON_SIZE}
        variant="cursorEq"
      />
    </ActivityStatusIconSC>
  )
}

function workbenchActivityTitle(type: Nullable<WorkbenchJobActivityType>) {
  switch (type) {
    case WorkbenchJobActivityType.User:
      return 'You'
    case WorkbenchJobActivityType.Memo:
      return 'Notes'
    case WorkbenchJobActivityType.Conclusion:
      return 'Conclusion'
    case WorkbenchJobActivityType.Function:
      return 'Function'
    case WorkbenchJobActivityType.Kubernetes:
      return 'Kubernetes'
    case WorkbenchJobActivityType.Exec:
      return 'Command'
    default:
      return startCase((type ?? 'activity').toLowerCase())
  }
}

/** Show the delegated prompt while running and the result once terminal. */
function workbenchActivitySummary({
  isRunning,
  prompt,
  output,
  error,
}: {
  isRunning: boolean
  prompt?: Nullable<string>
  output?: Nullable<string>
  error?: Nullable<string>
}): string {
  const raw = (isRunning ? [prompt] : [output, error, prompt])
    .map((value) => value?.trim())
    .find(Boolean)
  if (!raw) return ''

  const text = prettifyPrompt(raw)

  const line =
    text
      .split('\n')
      .map((part) =>
        part
          .replace(/^#{1,6}\s+/, '')
          .replace(/^[-*+]\s+/, '')
          .replace(/^\d+\.\s+/, '')
          .replace(/^>\s+/, '')
          .trim()
      )
      .find(Boolean) ?? ''

  return line.replace(/\s+/g, ' ').trim()
}

const ActivityCaretSC = styled(CaretDownIcon)<{ $isOpen: boolean }>(
  ({ theme, $isOpen }) => ({
    color: theme.colors['icon-xlight'],
    flexShrink: 0,
    opacity: $isOpen ? 1 : 0,
    rotate: $isOpen ? '0deg' : '-90deg',
    transition: 'opacity 0.15s ease, rotate 0.3s ease, scale 0.3s ease',
  })
)

const ActivityStatusIconSC = styled.span({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: ACTIVITY_STATUS_ICON_SIZE,
  height: ACTIVITY_STATUS_ICON_SIZE,
})

const ActivityHeaderSC = styled.span<{ $hasStatusIcon: boolean }>(
  ({ theme, $hasStatusIcon }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xxsmall,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    [`&:hover ${ActivityCaretSC}`]: {
      opacity: 1,
    },
    '.type': {
      flexShrink: 0,
    },
    '.summary': {
      display: 'block',
      minWidth: 0,
      maxWidth: '64ch',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      ...($hasStatusIcon && {
        paddingLeft: ACTIVITY_STATUS_ICON_SIZE + theme.spacing.xsmall,
      }),
    },
  })
)

const ActivityTitleRowSC = styled.span(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
}))
