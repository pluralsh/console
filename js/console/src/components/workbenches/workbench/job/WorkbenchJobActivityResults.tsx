import { ResponsiveLine, ResponsiveLineCanvas } from '@nivo/line'
import {
  Button,
  Card,
  CheckIcon,
  Code,
  CopyIcon,
  DiffMethod,
  DiffViewer,
  Flex,
  FlexProps,
  IconFrame,
  IconProps,
  Modal,
  NotebookIcon,
  useCopyText,
  WrapWithIf,
} from '@pluralsh/design-system'
import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import {
  PreviewablePanel,
  ShowMoreSC,
} from 'components/ai/chatbot/ToolCallContent'
import { LogLine } from 'components/cd/logs/LogLine'
import { GqlError } from 'components/utils/Alert'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchJobLogsToolQuery,
  useWorkbenchJobMetricsToolQuery,
  useWorkbenchJobTracesToolQuery,
  WorkbenchJobActivityLogFragment,
  WorkbenchJobActivityMetricFragment,
  WorkbenchJobActivityResultFragment,
  WorkbenchJobActivityTraceFragment,
  WorkbenchToolQueryData,
} from 'generated/graphql'
import { groupBy, isEmpty, isNil } from 'lodash'
import {
  ComponentPropsWithRef,
  ComponentType,
  ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
import { formatDateTime, toDateOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { getOldContentFromTextDiff } from 'utils/textDiff'
import { TraceWaterfall } from './WorkbenchJobTraces'

export function MemoActivityIcon({
  jobUpdate,
}: {
  jobUpdate: Nullable<WorkbenchJobActivityResultFragment['jobUpdate']>
}) {
  const newValue = jobUpdate?.workingTheory ?? jobUpdate?.conclusion ?? ''
  const oldValue = useMemo(
    () => getOldContentFromTextDiff(newValue, jobUpdate?.diff),
    [newValue, jobUpdate?.diff]
  )

  return (
    <ActivityModalIcon
      icon={NotebookIcon}
      tooltip="View diff"
      modalHeader={`Updated ${jobUpdate?.workingTheory ? 'working theory' : 'conclusion'}`}
      modalContent={
        <DiffViewer
          compareMethod={DiffMethod.WORDS}
          oldValue={oldValue}
          newValue={newValue}
        />
      }
    />
  )
}

export function ExpandableUserPrompt({
  prompt,
  timestamp,
  fullWidth = false,
  ...props
}: {
  prompt: Nullable<string>
  timestamp?: Nullable<string>
  fullWidth?: boolean
} & ComponentPropsWithRef<typeof PromptWrapperSC>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = bodyRef.current
    if (!element) return

    const updateCanExpand = () => {
      const nextCanExpand = element.scrollHeight > element.clientHeight + 1
      setCanExpand((prev) => {
        const next = isExpanded ? prev || nextCanExpand : nextCanExpand
        return prev === next ? prev : next
      })
    }

    updateCanExpand()
    const resizeObserver = new ResizeObserver(updateCanExpand)
    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [prompt, isExpanded])

  if (!prompt) return null

  const isExpandable = canExpand || isExpanded
  const showFade = !isExpanded && canExpand

  return (
    <PromptWrapperSC
      {...props}
      $fullWidth={fullWidth}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <PromptCardSC
        $fullWidth={fullWidth}
        $isExpanded={isExpandable && isExpanded}
      >
        <PromptBodySC
          ref={bodyRef}
          $expanded={isExpanded}
          $fade={showFade}
        >
          <SimplifiedMarkdown
            text={prompt}
            tone="thought"
          />
        </PromptBodySC>
        {isExpandable && (
          <ShowMoreSC
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((v) => !v)}
            css={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </ShowMoreSC>
        )}
      </PromptCardSC>
      <UserPromptActions
        content={prompt}
        timestamp={timestamp}
        show={showActions}
      />
    </PromptWrapperSC>
  )
}

function UserPromptActions({
  content,
  timestamp,
  show,
}: {
  content: string
  timestamp?: Nullable<string>
  show: boolean
}) {
  const { copied, handleCopy } = useCopyText(content, 2000)

  return (
    <PromptActionsSC
      onClick={(e) => e.stopPropagation()}
      $show={show}
    >
      <div>
        {timestamp && (
          <CaptionP $color="text-long-form">
            {formatDateTime(timestamp, 'h:mmA')}
          </CaptionP>
        )}
        <IconFrame
          clickable
          as="div"
          tooltip="Copy to clipboard"
          type="tertiary"
          onClick={(e) => {
            e.stopPropagation()
            handleCopy()
          }}
          icon={
            copied ? (
              <CheckIcon color="icon-success" />
            ) : (
              <CopyIcon color="icon-xlight" />
            )
          }
        />
      </div>
    </PromptActionsSC>
  )
}

export function JobActivityLogs({
  logs,
  cardWrapper = false,
  variant = 'default',
}: {
  logs: WorkbenchJobActivityLogFragment[]
  cardWrapper?: boolean
  variant?: 'canvas' | 'default'
}) {
  if (isEmpty(logs)) return null

  const lines = logs.map((log, i) => (
    <LogLine
      key={i}
      line={{ log: log.message, timestamp: log.timestamp }}
    />
  ))

  if (variant === 'canvas') return <CanvasLogPanelSC>{lines}</CanvasLogPanelSC>

  return (
    <WrapWithIf
      condition={cardWrapper}
      wrapper={<Card css={{ height: '100%', overflow: 'auto' }} />}
    >
      <Flex direction="column">{lines}</Flex>
    </WrapWithIf>
  )
}

const CANVAS_THRESHOLD = 1000

export type WorkbenchMetricsToolQueryInput = Pick<
  WorkbenchToolQueryData,
  'toolName' | 'toolArgs' | 'summary'
>

/** Used for `metricsTool` / `logsTool` when the canvas or activity includes tool name + args. */
export function hasWorkbenchMetricsToolQuery(
  q: Nullable<Pick<WorkbenchToolQueryData, 'toolName' | 'toolArgs'>>
): boolean {
  if (!q?.toolName?.trim()) return false
  return q.toolArgs != null && typeof q.toolArgs === 'object'
}

/**
 * Loads log lines via `logsTool` when `logsQuery` is present (e.g. canvas logs block).
 */
export function JobActivityLogsFromTool({
  jobId,
  logsQuery,
  fetchWhen = true,
  cardWrapper = false,
  variant,
}: {
  jobId: string
  logsQuery: Nullable<WorkbenchMetricsToolQueryInput>
  fetchWhen?: boolean
  cardWrapper?: boolean
  variant?: 'canvas' | 'default'
}) {
  const shouldRunQuery =
    !!jobId && fetchWhen && hasWorkbenchMetricsToolQuery(logsQuery)

  const { data, loading, error } = useWorkbenchJobLogsToolQuery({
    variables: {
      id: jobId,
      name: logsQuery?.toolName?.trim(),
      arguments: logsQuery?.toolArgs
        ? JSON.stringify(logsQuery?.toolArgs)
        : undefined,
    },
    skip: !shouldRunQuery,
  })

  if (!hasWorkbenchMetricsToolQuery(logsQuery)) return null

  if (!fetchWhen) return null

  if (error)
    return (
      <GqlError
        error={error}
        css={{ wordBreak: 'break-word' }}
      />
    )

  if (loading || !data)
    return (
      <RectangleSkeleton
        $height={120}
        $width="100%"
      />
    )

  const logs = data?.workbenchJob?.logsTool?.filter(isNonNullable) ?? []

  if (isEmpty(logs)) return null

  return (
    <JobActivityLogs
      logs={logs}
      cardWrapper={cardWrapper}
      variant={variant}
    />
  )
}

/** Renders pre-fetched metric points (e.g. thought tool attributes). */
export function JobActivityMetricsChart({
  metrics,
  lineProps,
  ...props
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
  lineProps?: Partial<
    ComponentPropsWithRef<typeof ResponsiveLine> &
      ComponentPropsWithRef<typeof ResponsiveLineCanvas>
  >
} & ComponentPropsWithRef<typeof MetricsChartSC>) {
  const graphTheme = useGraphTheme()

  const graphData = useMemo(() => {
    return getMetricSeries(metrics)
  }, [metrics])

  if (isEmpty(metrics)) return null

  const sharedProps = {
    theme: graphTheme,
    data: graphData,
    colors: COLORS,
    margin: { top: 10, right: 25, bottom: 30, left: 30 } as const,
    xScale: { type: 'time' as const, format: 'native' as const },
    yScale: { type: 'linear' as const },
    xFormat: dateFormat,
    lineWidth: 1,
    enablePoints: false,
    axisLeft: { tickValues: 5 },
    axisBottom: { format: '%H:%M:%S', tickValues: 5 },
    tooltip: SliceTooltip,
  }

  return (
    <MetricsChartSC {...props}>
      {metrics.length > CANVAS_THRESHOLD ? (
        <ResponsiveLineCanvas
          {...sharedProps}
          {...lineProps}
        />
      ) : (
        <ResponsiveLine
          {...sharedProps}
          useMesh
          {...lineProps}
        />
      )}
    </MetricsChartSC>
  )
}

/**
 * Loads metric series via `metricsTool` when `metricsQuery` is present on the
 * activity or job result. Omit when there is no tool query to run.
 */
export function JobActivityMetrics({
  jobId,
  metricsQuery,
  fetchWhen = true,
  withLegend = false,
  withSummary = true,
  withTimeRange = false,
  title,
  lineProps,
  skeletonHeight = 160,
  ...props
}: {
  jobId: string
  metricsQuery: Nullable<WorkbenchMetricsToolQueryInput>
  /** When false, skips the GraphQL request (e.g. collapsed activity accordion). */
  fetchWhen?: boolean
  withLegend?: boolean
  withSummary?: boolean
  withTimeRange?: boolean
  title?: Nullable<string>
  skeletonHeight?: number
  lineProps?: Partial<
    ComponentPropsWithRef<typeof ResponsiveLine> &
      ComponentPropsWithRef<typeof ResponsiveLineCanvas>
  >
} & ComponentPropsWithRef<typeof MetricsChartSC>) {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>('max')
  const shouldRunQuery =
    !!jobId && fetchWhen && hasWorkbenchMetricsToolQuery(metricsQuery)

  const { data, loading, error } = useWorkbenchJobMetricsToolQuery({
    variables: {
      id: jobId,
      name: metricsQuery?.toolName?.trim(),
      arguments: metricsQuery?.toolArgs
        ? JSON.stringify(metricsQuery?.toolArgs)
        : undefined,
    },
    skip: !shouldRunQuery,
  })

  if (!hasWorkbenchMetricsToolQuery(metricsQuery)) return null

  if (!fetchWhen) return null

  if (error)
    return (
      <GqlError
        error={error}
        css={{ wordBreak: 'break-word' }}
      />
    )

  const metrics = data?.workbenchJob?.metricsTool?.filter(isNonNullable) ?? []

  if (loading || !data)
    return (
      <RectangleSkeleton
        $height={skeletonHeight}
        $width="100%"
      />
    )

  const visibleMetrics = filterMetricsByRange(metrics, timeRange)

  if (isEmpty(visibleMetrics)) return null

  const series = getMetricSeries(visibleMetrics)
  const summaryText = withSummary ? metricsQuery?.summary?.trim() : undefined
  const legend = (
    <WorkbenchJobMetricsLegend
      series={series}
      paddingLeft={20}
    />
  )

  const chartBlock = (
    <Flex
      direction="column"
      gap="xsmall"
      width="100%"
    >
      {(title || withTimeRange) && (
        <MetricsChartHeaderSC>
          {title && <Body1P>{title}</Body1P>}
          {withTimeRange && (
            <MetricsRangeControl
              value={timeRange}
              onChange={setTimeRange}
            />
          )}
        </MetricsChartHeaderSC>
      )}
      {withLegend && legend}
      <JobActivityMetricsChart
        metrics={visibleMetrics}
        lineProps={lineProps}
        {...props}
      />
      {summaryText ? (
        <Body2P
          $color="text-light"
          css={{ lineHeight: 1.45 }}
        >
          {summaryText}
        </Body2P>
      ) : null}
    </Flex>
  )

  return chartBlock
}

type MetricsTimeRange = '1d' | '1m' | '1y' | 'max'

const METRICS_TIME_RANGES: { label: string; value: MetricsTimeRange }[] = [
  { label: '1D', value: '1d' },
  { label: '1M', value: '1m' },
  { label: '1Y', value: '1y' },
  { label: 'Max', value: 'max' },
]

function MetricsRangeControl({
  value,
  onChange,
}: {
  value: MetricsTimeRange
  onChange: (value: MetricsTimeRange) => void
}) {
  return (
    <MetricsRangeControlSC aria-label="Metrics time range">
      {METRICS_TIME_RANGES.map(({ label, value: range }) => (
        <MetricsRangeButtonSC
          key={range}
          $active={range === value}
          type="button"
          onClick={() => onChange(range)}
        >
          {label}
        </MetricsRangeButtonSC>
      ))}
    </MetricsRangeControlSC>
  )
}

function filterMetricsByRange(
  metrics: WorkbenchJobActivityMetricFragment[],
  range: MetricsTimeRange
) {
  if (range === 'max') return metrics

  const latest = Math.max(
    ...metrics
      .map((metric) => toDateOrUndef(metric.timestamp)?.getTime())
      .filter(isNonNullable)
  )

  if (!Number.isFinite(latest)) return metrics

  const durationByRange: Record<Exclude<MetricsTimeRange, 'max'>, number> = {
    '1d': 24 * 60 * 60 * 1_000,
    '1m': 30 * 24 * 60 * 60 * 1_000,
    '1y': 365 * 24 * 60 * 60 * 1_000,
  }
  const from = latest - durationByRange[range]

  return metrics.filter((metric) => {
    const timestamp = toDateOrUndef(metric.timestamp)?.getTime()
    return timestamp != null && timestamp >= from
  })
}

/**
 * Renders the stored trace result when available, otherwise reloads it through
 * `tracesTool` from the query that produced the canvas or activity result.
 */
export function JobActivityTraces({
  jobId,
  traces,
  tracesQuery,
  fetchWhen = true,
  withSummary = true,
}: {
  jobId: string
  traces?: Nullable<Nullable<WorkbenchJobActivityTraceFragment>[]>
  tracesQuery: Nullable<WorkbenchMetricsToolQueryInput>
  fetchWhen?: boolean
  withSummary?: boolean
}) {
  const directTraces = traces?.filter(isNonNullable) ?? []
  const shouldRunQuery =
    !!jobId &&
    fetchWhen &&
    isEmpty(directTraces) &&
    hasWorkbenchMetricsToolQuery(tracesQuery)

  const { data, loading, error } = useWorkbenchJobTracesToolQuery({
    variables: {
      id: jobId,
      name: tracesQuery?.toolName?.trim(),
      arguments: tracesQuery?.toolArgs
        ? JSON.stringify(tracesQuery.toolArgs)
        : undefined,
    },
    skip: !shouldRunQuery,
  })

  if (isEmpty(directTraces) && !hasWorkbenchMetricsToolQuery(tracesQuery))
    return null

  if (!fetchWhen) return null

  if (error)
    return (
      <GqlError
        error={error}
        css={{ wordBreak: 'break-word' }}
      />
    )

  if (isEmpty(directTraces) && (loading || !data))
    return (
      <RectangleSkeleton
        $height={200}
        $width="100%"
      />
    )

  const fetchedTraces =
    data?.workbenchJob?.tracesTool?.filter(isNonNullable) ?? []
  const resolvedTraces = isEmpty(directTraces) ? fetchedTraces : directTraces

  if (isEmpty(resolvedTraces)) return null

  return (
    <TraceWaterfall
      traces={resolvedTraces}
      summary={withSummary ? tracesQuery?.summary : undefined}
    />
  )
}

export function WorkbenchJobMetricsLegend({
  series,
  ...props
}: {
  series: MetricSeries[]
} & FlexProps) {
  if (isEmpty(series)) return null

  return (
    <Flex
      wrap="wrap"
      gap="small"
      align="center"
      {...props}
    >
      {series.map(({ id, label }, i) => (
        <Flex
          key={id}
          align="center"
          gap="xsmall"
        >
          <MetricsLegendSwatchSC $color={COLORS[i % COLORS.length]} />
          <Body2P $color="text-light">{label}</Body2P>
        </Flex>
      ))}
    </Flex>
  )
}

type MetricSeries = {
  data: { x: Date; y: number }[]
  id: string
  label: string
}

export function getMetricSeries(
  metrics: WorkbenchJobActivityMetricFragment[]
): MetricSeries[] {
  const grouped = groupBy(metrics, metricSeriesId)

  return Object.entries(grouped).map(([id, points]) => ({
    id,
    label: metricSeriesLabel(points[0]),
    data: points
      .map((point) => ({ x: toDateOrUndef(point.timestamp), y: point.value }))
      .filter(
        (point): point is { x: Date; y: number } =>
          !isNil(point.x) && !isNil(point.y)
      ),
  }))
}

function metricSeriesId({
  name,
  labels,
}: WorkbenchJobActivityMetricFragment): string {
  return `${name ?? 'metric'}{${metricLabelEntries(labels)
    .map(([key, value]) => `${key}:${value}`)
    .join(',')}}`
}

function metricSeriesLabel({
  name,
  labels,
}: WorkbenchJobActivityMetricFragment): string {
  const label = metricLabelEntries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')

  return label || name || 'metric'
}

function metricLabelEntries(labels: Nullable<Record<string, unknown>>) {
  return Object.entries(labels ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  )
}

export function JobActivityPrompt({ prompt }: { prompt: Nullable<string> }) {
  if (!prompt) return null
  return (
    <PreviewablePanel
      contentKey={`prompt:${prompt.length}`}
      subtle
      collapsedLines={2}
    >
      <SimplifiedMarkdown
        text={prompt}
        tone="thought"
      />
    </PreviewablePanel>
  )
}

export function ActivityModalIcon({
  icon: Icon,
  onClick,
  tooltip,
  modalHeader,
  modalContent,
  size = 14,
}: {
  icon: ComponentType<IconProps>
  onClick?: () => void
  tooltip: string | undefined
  modalHeader: string
  modalContent: ReactNode
  size?: number
}) {
  const [showModal, setShowModal] = useState(false)
  const [finishedAnimating, setFinishedAnimating] = useState(false)
  return (
    <>
      <IconFrame
        clickable
        as="a" // using an "a" tag because technically buttons can't be nested inside other buttons (e.g. the accordion trigger)
        size="small"
        tooltip={tooltip}
        icon={
          <Icon
            color="icon-xlight"
            style={{ width: size }}
          />
        }
        onClick={(e) => {
          e.preventDefault()
          setShowModal(true)
          onClick?.()
        }}
      />
      <Modal
        header={modalHeader}
        size="large"
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setFinishedAnimating(false)
        }}
        scrollable={false}
        onAnimationEnd={() => setFinishedAnimating(true)}
        actions={
          <Button
            secondary
            onClick={() => setShowModal(false)}
          >
            Close
          </Button>
        }
      >
        {finishedAnimating ? (
          modalContent
        ) : (
          <RectangleSkeleton
            $height={160}
            $width="100%"
          />
        )}
      </Modal>
    </>
  )
}

const MetricsChartSC = styled.div(() => ({
  height: 160,
  width: '100%',
}))

const MetricsChartHeaderSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
  justifyContent: 'space-between',
  minWidth: 0,
  width: '100%',
}))

const MetricsRangeControlSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  flexShrink: 0,
  gap: 2,
  padding: 2,
}))

const MetricsRangeButtonSC = styled.button<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.reset.button,
    ...theme.partials.text.buttonSmall,
    background: $active ? theme.colors['fill-three'] : 'transparent',
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['text-light'],
    cursor: $active ? 'default' : 'pointer',
    minHeight: 32,
    minWidth: 32,
    padding: `0 ${theme.spacing.xsmall}px`,
    '&:focus-visible': {
      outline: `1px solid ${theme.colors['border-outline-focused']}`,
      outlineOffset: 1,
    },
  })
)

const CanvasLogPanelSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  flex: '0 1 auto',
  flexDirection: 'column',
  maxHeight: 300,
  overflowY: 'auto',
  padding: `${theme.spacing.medium}px 0`,
  width: '100%',
}))

const MetricsLegendSwatchSC = styled.div<{ $color: string }>(({ $color }) => ({
  width: 12,
  height: 12,
  borderRadius: 2,
  flexShrink: 0,
  background: $color,
}))

const PromptWrapperSC = styled.div<{ $fullWidth?: boolean }>(
  ({ theme, $fullWidth }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: $fullWidth ? 'stretch' : 'flex-end',
    width: '100%',
    marginTop: theme.spacing.small,
    marginBottom: theme.spacing.xsmall,
  })
)

const PromptActionsSC = styled.div<{ $show: boolean }>(({ theme, $show }) => ({
  display: 'grid',
  gridTemplateRows: $show ? '1fr' : '0fr',
  justifyItems: 'end',
  width: '100%',
  opacity: $show ? 1 : 0,
  transition: 'grid-template-rows 0.25s ease, opacity 0.25s ease',
  pointerEvents: $show ? 'auto' : 'none',
  '> div': {
    overflow: 'hidden',
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.xxsmall,
    paddingTop: 6,
  },
}))

const PromptCardSC = styled(Card)<{
  $isExpanded?: boolean
  $fullWidth?: boolean
}>(({ theme, $isExpanded, $fullWidth }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing.medium,
  width: $fullWidth ? '100%' : 'fit-content',
  maxWidth: '100%',
  overflow: 'hidden',
  wordBreak: 'break-word',
  border: $isExpanded ? 'none' : undefined,
  [`& ${Code}`]: {
    backgroundColor: theme.colors['fill-two'],
    borderColor: theme.colors['border-fill-two'],
  },
}))

const PromptBodySC = styled.div<{
  $expanded: boolean
  $fade?: boolean
}>(({ $expanded, $fade }) => ({
  minWidth: 0,
  minHeight: 0,
  maxHeight: $expanded ? 'none' : '4lh',
  overflow: $expanded ? 'visible' : 'hidden',
  lineHeight: 1.45,
  ...($fade && {
    maskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
  }),
}))
