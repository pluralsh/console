import {
  AccordionItem,
  Card,
  FailedFilledIcon,
  Flex,
  IconFrame,
  Markdown,
  Modal,
  TimeSeriesIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import {
  AgentRunIcon,
  AgentRunInfoCard,
  AgentRunInfoSimple,
} from 'components/ai/agent-runs/AgentRunInfoDisplays'
import {
  ClickableLabelSC,
  SimpleAccordion,
  SimpleToolCall,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { toolCallGroupHeader } from 'components/ai/chatbot/toolCallDisplay'
import pluralize from 'pluralize'
import { POLL_INTERVAL } from 'components/cluster/constants'
import { AILoadingText } from 'components/utils/AILoadingText'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { EaseIn } from 'components/utils/EaseIn'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P, CaptionP, SpanSC } from 'components/utils/typography/Text'
import {
  AgentRunStatus,
  useWorkbenchJobActivityQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobProgressFragment,
  WorkbenchJobStatus,
  WorkbenchJobThoughtFragment,
} from 'generated/graphql'
import { isEmpty, startCase } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ActivityModalIcon,
  hasWorkbenchMetricsToolQuery,
  JobActivityLogs,
  JobActivityMetrics,
  JobActivityMetricsChart,
  JobActivityPrompt,
  MemoActivityIcon,
  ExpandableUserPrompt,
} from './WorkbenchJobActivityResults'
import { WorkbenchJobCanvas } from './WorkbenchJobCanvas'
import { WorkbenchJobInlineActionCard } from './WorkbenchJobInlineActionCard'

export function WorkbenchJobActivity({
  isOpen,
  activity,
  textStream,
  jobId,
  workbenchId,
  workbenchName,
}: {
  isOpen: boolean
  activity: WorkbenchJobActivityFragment
  textStream: Nullable<string>
  jobId: string
  workbenchId: string
  workbenchName: string
}) {
  const { spacing } = useTheme()
  const { id, status, type, prompt, agentRun, result } = activity
  const isRunning = isJobRunning(status)
  const isRejected = status === WorkbenchJobActivityStatus.Rejected

  if (
    type === WorkbenchJobActivityType.Function ||
    type === WorkbenchJobActivityType.Kubernetes ||
    type === WorkbenchJobActivityType.Exec
  )
    return <WorkbenchJobInlineActionCard activity={activity} />

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
    return (
      <ExpandableUserPrompt
        prompt={activity.prompt}
        timestamp={activity.insertedAt}
      />
    )

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
          >
            {workbenchActivityTitle(type)}
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
                />
              }
              tooltip="Go to agent run details"
            />
          )}
          {(status === WorkbenchJobActivityStatus.Failed || isRejected) && (
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
        {prompt && <JobActivityPrompt prompt={prompt} />}
        <WorkbenchJobActivityThoughts
          activityId={id}
          skip={!isOpen}
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
        caret="right-quarter-mirror"
        triggerWrapperStyles={{
          justifyContent: 'flex-start',
          gap: spacing.xsmall,
          '.icon': { width: 10 },
        }}
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
  const { prompt, result, status } = activity
  const [isOpen, setIsOpen] = useState(false)
  const [finishedAnimating, setFinishedAnimating] = useState(false)
  const isRunning = isJobRunning(status)
  const isFailed = status === WorkbenchJobActivityStatus.Failed
  const isRejected = status === WorkbenchJobActivityStatus.Rejected
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

  return (
    <MemoRowSC>
      <ClickableLabelSC onClick={() => setIsOpen(true)}>
        <MemoLabelSC $shimmer={isRunning}>{label}</MemoLabelSC>
      </ClickableLabelSC>
      {result?.jobUpdate && <MemoActivityIcon jobUpdate={result.jobUpdate} />}
      {(isFailed || isRejected) && (
        <FailedFilledIcon
          size={12}
          color="icon-danger"
        />
      )}
      <Modal
        open={isOpen}
        onClose={() => {
          setIsOpen(false)
          setFinishedAnimating(false)
        }}
        onAnimationEnd={() => setFinishedAnimating(true)}
        header={workingTheory ? 'Working theory' : 'Memo'}
        size="large"
      >
        {finishedAnimating ? (
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
            {fullText && <SimplifiedMarkdown text={fullText} />}
          </Flex>
        ) : (
          <RectangleSkeleton
            $height={160}
            $width="100%"
          />
        )}
      </Modal>
    </MemoRowSC>
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
      gap="medium"
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
            <SimplifiedMarkdown text={result?.output ?? ''} />
          ) : (
            <Markdown text={result?.output ?? ''} />
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

const MemoRowSC = styled.div(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  width: '100%',
  '& > button': {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
}))

const MemoLabelSC = styled(CaptionP)(({ theme }) => ({
  color: theme.colors['text-xlight'],
  display: 'block',
  minWidth: 0,
  width: '100%',
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

  const { thoughts, lastThought, header } = useMemo(() => {
    const thoughts = activity?.thoughts?.filter(isNonNullable) ?? []
    let [numWithLogs, numWithMetrics] = [0, 0]
    const otherThoughts: Array<{
      name?: string | null
      arguments?: WorkbenchJobThoughtFragment['toolArgs']
    }> = []
    thoughts.forEach((thought) => {
      if (!isEmpty(thought.attributes?.logs)) numWithLogs += 1
      else if (!isEmpty(thought.attributes?.metrics)) numWithMetrics += 1
      else
        otherThoughts.push({
          name: thought.toolName,
          arguments: thought.toolArgs,
        })
    })
    const parts = [
      toolCallGroupHeader(otherThoughts),
      numWithLogs > 0 &&
        `${numWithLogs} fetched ${pluralize('log', numWithLogs)}`,
      numWithMetrics > 0 &&
        `${numWithMetrics} fetched ${pluralize('metric', numWithMetrics)}`,
    ].filter(Boolean)
    return {
      thoughts,
      lastThought: thoughts.at(-1),
      header:
        parts.join(', ') ||
        `${thoughts.length} tool ${pluralize('call', thoughts.length)}`,
    }
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
      {!isExpanded && lastThought && isJobRunning(activity?.status) && (
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

/** Cycles 1 → 2 → 3 dots every second for the job-level thinking label. */
function useThinkingEllipsisCount() {
  const [count, setCount] = useState(1)
  useEffect(() => {
    const id = window.setInterval(() => {
      setCount((n) => (n >= 3 ? 1 : n + 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])
  return count
}

/**
 * Job-level tool progress (between activities): same accordion + SimpleToolCall UI as
 * activity thoughts, with a fixed "thinking" label instead of the tool-call count header.
 */
export function WorkbenchJobJobLevelThinking({
  items,
  jobRunning,
}: {
  items: Array<WorkbenchJobProgressFragment & { localKey: number }>
  jobRunning: boolean
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const last = items.at(-1)
  const ellipsisCount = useThinkingEllipsisCount()

  if (isEmpty(items)) return null

  return (
    <>
      <SimpleAccordion
        label={
          <>
            Thinking
            <span
              style={{
                display: 'inline-block',
                minWidth: '3ch',
                textAlign: 'left',
              }}
            >
              {'.'.repeat(ellipsisCount)}
            </span>
          </>
        }
        loading={false}
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
          {items.map((item) => (
            <WorkbenchJobLevelThinkingCall
              key={item.localKey}
              item={item}
            />
          ))}
        </Flex>
      </SimpleAccordion>
      {!isExpanded && last && jobRunning && (
        <EaseIn currentKey={last.localKey}>
          <WorkbenchJobLevelThinkingCall item={last} />
        </EaseIn>
      )}
    </>
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

const SUBAGENT_ACTIVITY_TYPES = new Set([
  WorkbenchJobActivityType.Coding,
  WorkbenchJobActivityType.Infrastructure,
  WorkbenchJobActivityType.Observability,
  WorkbenchJobActivityType.Integration,
  WorkbenchJobActivityType.Skill,
  WorkbenchJobActivityType.History,
  WorkbenchJobActivityType.Search,
  WorkbenchJobActivityType.Verify,
  WorkbenchJobActivityType.Memory,
  WorkbenchJobActivityType.Canvas,
  WorkbenchJobActivityType.Plan,
])

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
    default: {
      const name = startCase((type ?? 'activity').toLowerCase())
      return SUBAGENT_ACTIVITY_TYPES.has(type as WorkbenchJobActivityType)
        ? `${name} subagent`
        : name
    }
  }
}
