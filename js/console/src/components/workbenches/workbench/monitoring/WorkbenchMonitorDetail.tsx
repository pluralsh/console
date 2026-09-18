import {
  Card,
  Chip,
  EmptyState,
  ExpandIcon,
  Flex,
  GearTrainIcon,
  HamburgerMenuCollapsedIcon,
  IconFrame,
  useResizeObserver,
} from '@pluralsh/design-system'
import { Line } from '@nivo/line'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { TRUNCATE } from 'components/utils/truncate'
import {
  Body1P,
  Body2P,
  CaptionP,
} from 'components/utils/typography/Text'
import { WorkbenchUsageChips } from 'components/workbenches/common/WorkbenchUsageChips'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import { WorkbenchJobActionsRow } from 'components/workbenches/workbench/WorkbenchJobsTable'
import { cronToExplanation } from 'components/workbenches/workbench/crons/utils'
import {
  AlertSeverity,
  InputMaybe,
  LogQueryOperator,
  MonitorAggregate,
  MonitorType,
  useLogAggregationBucketsQuery,
  useWorkbenchMonitorJobsQuery,
  useWorkbenchMonitorQuery,
  WorkbenchJobTinyFragment,
  WorkbenchMonitorDetailsFragment,
} from 'generated/graphql'
import { isEmpty, isNil } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  getWorkbenchJobAbsPath,
  getWorkbenchMonitoringMonitorSettingsAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { COLORS } from 'utils/color'
import { formatMinutesAsDuration, fromNow, toDateOrUndef } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { MonitoringDetailSkeleton } from './WorkbenchDashboardDetail'
import { DashboardToolIcon, toolDisplayName } from './dashboardToolIcon'
import {
  monitorDefinitionYaml,
  monitoringDefinitionFilename,
} from './definitionYaml'
import { ExitFullscreenButton } from './ExitFullscreenButton'
import {
  DefinitionPanelShell,
  useDefinitionPanelContainer,
  WorkbenchMonitoringDefinitionPanel,
} from './WorkbenchMonitoringDefinitionPanel'
import { WorkbenchMonitoringSharePopover } from './WorkbenchMonitoringSharePopover'
import parseDuration from 'parse-duration-ms'

const CHART_HEIGHT_PX = 280
const RECENT_JOBS_COUNT = 6

export function MonitorDetail({
  monitorId,
  onUpdateViaPrompt,
}: {
  monitorId: string
  onUpdateViaPrompt?: () => void
}) {
  const { data, loading, error } = useWorkbenchMonitorQuery({
    variables: { id: monitorId },
    fetchPolicy: 'cache-and-network',
  })

  if (loading && !data) return <MonitoringDetailSkeleton />
  if (error) return <GqlError error={error} />
  const monitor = data?.monitor
  if (!monitor)
    return (
      <MainSC>
        <EmptyState message="Monitor not found." />
      </MainSC>
    )

  return (
    <MonitorDetailView
      monitor={monitor}
      onUpdateViaPrompt={onUpdateViaPrompt}
    />
  )
}

function MonitorDetailView({
  monitor,
  onUpdateViaPrompt,
}: {
  monitor: WorkbenchMonitorDetailsFragment
  onUpdateViaPrompt?: () => void
}) {
  const workbenchId = monitor.workbench?.id
  const queryText =
    monitor.type === MonitorType.Metrics
      ? monitor.query?.metrics?.query
      : monitor.query?.log?.query
  const toolName =
    monitor.type === MonitorType.Metrics
      ? monitor.query?.metrics?.tool
      : monitor.query?.log?.tool
  const forDuration =
    monitor.type === MonitorType.Metrics
      ? monitor.query?.metrics?.duration
      : monitor.query?.log?.duration
  const { pathname } = useLocation()
  const [definitionOpen, setDefinitionOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const fullscreenTriggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useDefinitionPanelContainer()
  const definitionYaml = useMemo(
    () => monitorDefinitionYaml(monitor),
    [monitor]
  )
  const definitionFilename = monitoringDefinitionFilename(
    'monitor',
    monitor.name
  )

  const openFullscreen = () => {
    setDefinitionOpen(false)
    setFullscreen(true)
  }

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  useEffect(() => {
    if (fullscreen) return
    requestAnimationFrame(() => fullscreenTriggerRef.current?.focus())
  }, [fullscreen])

  return (
    <DefinitionPanelShell
      containerRef={containerRef}
      panel={
        <WorkbenchMonitoringDefinitionPanel
          open={definitionOpen && !fullscreen}
          onClose={() => setDefinitionOpen(false)}
          filename={definitionFilename}
          yaml={definitionYaml}
          containerRef={containerRef}
          onUpdateViaPrompt={onUpdateViaPrompt}
        />
      }
    >
      <MainSC $fullscreen={fullscreen}>
        {!fullscreen && (
          <StripSC>
            <EyebrowSC>Monitor</EyebrowSC>
            <StripActionsSC>
              <CaptionP $color="text-xlight">
                {monitor.updatedAt
                  ? `updated ${fromNow(monitor.updatedAt)}`
                  : 'Never updated'}
              </CaptionP>
              <WorkbenchMonitoringSharePopover
                kind="monitor"
                pathname={pathname}
              />
              {workbenchId && (
                <IconFrame
                  clickable
                  size="small"
                  type="tertiary"
                  icon={<GearTrainIcon />}
                  textValue="Monitor settings"
                  as={Link}
                  to={getWorkbenchMonitoringMonitorSettingsAbsPath({
                    workbenchId,
                    monitorId: monitor.id,
                  })}
                />
              )}
              <IconFrame
                ref={fullscreenTriggerRef}
                clickable
                size="small"
                type="tertiary"
                icon={<ExpandIcon />}
                textValue="Full screen"
                onClick={openFullscreen}
              />
              <IconFrame
                clickable
                size="small"
                type="tertiary"
                icon={<HamburgerMenuCollapsedIcon />}
                textValue="Definition"
                onClick={() => setDefinitionOpen(true)}
              />
            </StripActionsSC>
          </StripSC>
        )}
        <BodySC>
          <TitleRowSC>
            <TitleBlockSC>
              <TitleSC>{monitor.name}</TitleSC>
              {monitor.description && (
                <Body1P
                  $color="text-long-form"
                  css={{ letterSpacing: '0.25px' }}
                >
                  {monitor.description}
                </Body1P>
              )}
              {fullscreen && (
                <CaptionP $color="text-xlight">
                  {monitor.updatedAt
                    ? `updated ${fromNow(monitor.updatedAt)}`
                    : 'Never updated'}
                </CaptionP>
              )}
            </TitleBlockSC>
            {fullscreen && (
              <ExitFullscreenButton onClick={() => setFullscreen(false)} />
            )}
          </TitleRowSC>
          <ColumnsSC>
            <DefinitionCardSC>
              <DefinitionHeaderSC>
                <Body1P css={{ margin: 0 }}>Definition</Body1P>
                {!fullscreen && (
                  <IconFrame
                    clickable
                    size="small"
                    type="tertiary"
                    icon={<HamburgerMenuCollapsedIcon />}
                    textValue="Definition"
                    onClick={() => setDefinitionOpen(true)}
                  />
                )}
              </DefinitionHeaderSC>
              <SectionSC>
                <QueryHeaderSC>
                  <Body2P $color="text-xlight">Query</Body2P>
                  {toolName && (
                    <Flex
                      align="center"
                      gap="xsmall"
                    >
                      <DashboardToolIcon
                        tool={toolName}
                        size={12}
                      />
                      <Body2P>{toolDisplayName(toolName)}</Body2P>
                    </Flex>
                  )}
                </QueryHeaderSC>
                <QueryBlockSC>{queryText || '—'}</QueryBlockSC>
              </SectionSC>
              <SectionSC>
                <FiresWhenSC>
                  <Body2P $color="text-xlight">Fires when</Body2P>
                  <ChipsSC>
                    <FireChip
                      label="Condition"
                      value={conditionLabel(monitor.threshold)}
                      $tone="success"
                    />
                    <FireChip
                      label="For"
                      value={forLabel(forDuration)}
                    />
                    <FireChip
                      label="Evaluate"
                      value={evaluateLabel(monitor.evaluationCron)}
                    />
                    <FireChip
                      label="Severity"
                      value={severityLabel(monitor.severity)}
                      $tone={severityTone(monitor.severity)}
                    />
                  </ChipsSC>
                </FiresWhenSC>
                <ChartWrapSC>
                  <MonitorThresholdChart monitor={monitor} />
                </ChartWrapSC>
              </SectionSC>
            </DefinitionCardSC>
            {workbenchId && (
              <MonitorRecentJobs
                workbenchId={workbenchId}
                monitorId={monitor.id}
                monitorName={monitor.name}
              />
            )}
          </ColumnsSC>
        </BodySC>
      </MainSC>
    </DefinitionPanelShell>
  )
}

function MonitorThresholdChart({
  monitor,
}: {
  monitor: WorkbenchMonitorDetailsFragment
}) {
  const serviceId = monitor.service?.id
  const log = monitor.query?.log
  const isLog = monitor.type === MonitorType.Log && !!log && !!serviceId

  if (!isLog) {
    return (
      <EmptyState message="Threshold preview is available for log monitors with a linked service." />
    )
  }

  return (
    <LogThresholdPreview
      serviceId={serviceId}
      query={log.query}
      bucketSize={log.bucketSize}
      duration={log.duration}
      operator={log.operator}
      facets={
        log.facets?.filter(isNonNullable).map((f) => ({
          key: f.key,
          value: f.value,
        })) ?? []
      }
      threshold={monitor.threshold}
    />
  )
}

function LogThresholdPreview({
  serviceId,
  query,
  bucketSize,
  duration,
  operator,
  facets,
  threshold,
}: {
  serviceId: string
  query: string
  bucketSize: string
  duration?: string | null
  operator?: string | null
  facets: { key: string; value: string }[]
  threshold: { aggregate: MonitorAggregate; value: number }
}) {
  const graphTheme = useGraphTheme()
  const { colors } = useTheme()
  const { data, loading, error } = useLogAggregationBucketsQuery({
    variables: {
      serviceId,
      query,
      time: { duration: duration ?? undefined },
      aggregation: { bucketSize },
      operator: operator as InputMaybe<LogQueryOperator> | undefined,
      facets,
    },
    fetchPolicy: 'cache-and-network',
  })

  const buckets = useMemo(
    () => data?.logAggregationBuckets?.filter(isNonNullable) ?? [],
    [data]
  )

  const graphData = useMemo(
    () => [
      {
        id: 'Log count',
        data: buckets
          .map((b) => ({ x: toDateOrUndef(b.timestamp), y: b.count }))
          .filter(
            (point): point is { x: Date; y: number } =>
              !isNil(point.x) && !isNil(point.y)
          ),
      },
    ],
    [buckets]
  )

  const thresholdLayer = useCallback(
    ({ yScale }: { yScale: (v: number) => number }) => {
      const y = yScale(threshold.value)
      return (
        <text
          y={y}
          textAnchor="end"
          css={{ fill: colors['border-danger'], fontSize: 11 }}
        >
          <tspan
            x={-8}
            dy="-0.5em"
          >
            Threshold {threshold.value}
          </tspan>
        </text>
      )
    },
    [colors, threshold.value]
  )

  const chartRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useResizeObserver(chartRef, (rect) => {
    const width = Math.floor(rect.width)
    const height = Math.floor(rect.height)
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    )
  })

  if (!data && loading)
    return (
      <RectangleSkeleton
        $height={CHART_HEIGHT_PX}
        $width="100%"
      />
    )
  if (error) return <GqlError error={error} />
  if (isEmpty(graphData[0].data))
    return <EmptyState message="No log data found for this query." />

  return (
    <GraphWrapperSC ref={chartRef}>
      {size.width > 0 && size.height > 0 && (
        <Line
          width={size.width}
          height={size.height}
          theme={graphTheme}
          data={graphData}
          tooltip={SliceTooltip}
          colors={COLORS}
          layers={[
            'grid',
            'axes',
            'areas',
            'crosshair',
            'lines',
            'markers',
            thresholdLayer,
            'points',
            'slices',
            'mesh',
          ]}
          margin={{ top: 20, right: 20, bottom: 48, left: 48 }}
          xScale={{ type: 'time', format: 'native' }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          xFormat={dateFormat}
          lineWidth={1}
          enablePoints={false}
          useMesh
          axisBottom={{ format: '%H:%M', tickRotation: 20 }}
          markers={[
            {
              axis: 'y',
              value: threshold.value,
              lineStyle: {
                stroke: colors['border-danger'],
                strokeDasharray: '6 4',
              },
            },
          ]}
        />
      )}
    </GraphWrapperSC>
  )
}

function MonitorRecentJobs({
  workbenchId,
  monitorId,
  monitorName,
}: {
  workbenchId: string
  monitorId: string
  monitorName: string
}) {
  const { data, loading, error } = useWorkbenchMonitorJobsQuery({
    variables: { id: workbenchId, monitorId, first: RECENT_JOBS_COUNT },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const jobs = useMemo(
    () => mapExistingNodes(data?.workbench?.runs),
    [data]
  )

  return (
    <RecentSectionSC>
      <Body1P css={{ margin: 0 }}>Recent jobs</Body1P>
      {error && <GqlError error={error} />}
      {loading && isEmpty(jobs) ? (
        <JobsGridSC>
          {Array.from({ length: 3 }).map((_, i) => (
            <RectangleSkeleton
              key={i}
              $height={140}
              $width="100%"
            />
          ))}
        </JobsGridSC>
      ) : isEmpty(jobs) ? (
        <EmptyJobsSC>
          <EmptyState
            message={`No recent jobs yet, ${monitorName} has not fired.`}
          />
        </EmptyJobsSC>
      ) : (
        <JobsGridSC>
          {jobs.map((job) => (
            <MonitorJobCard
              key={job.id}
              job={job}
            />
          ))}
        </JobsGridSC>
      )}
    </RecentSectionSC>
  )
}

function MonitorJobCard({ job }: { job: WorkbenchJobTinyFragment }) {
  const workbenchId = job.workbench?.id
  if (!workbenchId) return null

  return (
    <JobCardSC
      clickable
      forwardedAs={Link}
      to={getWorkbenchJobAbsPath({ workbenchId, jobId: job.id })}
    >
      <StretchedFlex>
        <CaptionP
          $color="text-xlight"
          css={TRUNCATE}
        >
          {job.user?.name ?? '—'}
        </CaptionP>
        <Flex
          align="center"
          gap="small"
        >
          <CaptionP $color="text-xlight">{fromNow(job.insertedAt)}</CaptionP>
          <RunStatusIcon
            fullColor
            status={job.status}
          />
        </Flex>
      </StretchedFlex>
      <WorkbenchStoredPromptMarkdown
        text={job.prompt ?? ''}
        density="jobCard"
        clampLines={2}
      />
      <WorkbenchUsageChips
        usage={job.usage}
        budget={job.modes?.budget}
        error={job.error}
      />
      <WorkbenchJobActionsRow
        job={job}
        chipFillLevel={2}
      />
    </JobCardSC>
  )
}

function FireChip({
  label,
  value,
  $tone = 'default',
}: {
  label: string
  value: string
  $tone?: 'default' | 'success' | 'warning'
}) {
  return (
    <FireChipSC>
      <CaptionP $color="text-input-disabled">{label}</CaptionP>
      <Chip
        size="small"
        severity={
          $tone === 'success'
            ? 'success'
            : $tone === 'warning'
              ? 'warning'
              : 'neutral'
        }
      >
        {value}
      </Chip>
    </FireChipSC>
  )
}

function conditionLabel(threshold: {
  aggregate: MonitorAggregate
  value: number
}) {
  const op =
    threshold.aggregate === MonitorAggregate.Min
      ? '<'
      : threshold.aggregate === MonitorAggregate.Max
        ? '>'
        : '≥'
  return `${op}${threshold.value}`
}

function forLabel(duration?: string | null) {
  if (!duration) return '—'
  const ms = parseDuration(duration)
  if (ms == null) return duration
  return formatMinutesAsDuration(Math.round(ms / 60_000)) || duration
}

function evaluateLabel(cron: string) {
  try {
    return cronToExplanation({ crontab: cron }).replace(/, next at.*$/, '')
  } catch {
    return cron
  }
}

function severityLabel(severity: AlertSeverity) {
  switch (severity) {
    case AlertSeverity.Critical:
      return 'Critical'
    case AlertSeverity.High:
      return 'High'
    case AlertSeverity.Medium:
      return 'Medium'
    case AlertSeverity.Low:
      return 'Low'
    default:
      return 'Undefined'
  }
}

function severityTone(
  severity: AlertSeverity
): 'default' | 'success' | 'warning' {
  switch (severity) {
    case AlertSeverity.Critical:
    case AlertSeverity.High:
    case AlertSeverity.Medium:
      return 'warning'
    default:
      return 'default'
  }
}

const MainSC = styled.div<{ $fullscreen?: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflow: 'auto',
    padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
    ...($fullscreen && {
      backgroundColor: theme.colors['fill-accent'],
      height: '100%',
      inset: 0,
      position: 'fixed',
      width: '100%',
      zIndex: theme.zIndexes.modal,
    }),
  })
)

const StripSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  boxSizing: 'border-box',
  margin: `-${theme.spacing.medium}px -${theme.spacing.large}px 0`,
  backgroundColor: theme.colors['fill-one-selected'],
  borderBottom: theme.borders.default,
  borderTop: theme.borders.default,
  display: 'flex',
  gap: theme.spacing.small,
  height: 40,
  justifyContent: 'space-between',
  padding: `0 ${theme.spacing.medium}px`,
}))

const StripActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
}))

const EyebrowSC = styled.p(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  margin: 0,
}))

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  paddingTop: theme.spacing.medium,
}))

const TitleBlockSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const TitleRowSC = styled.div(({ theme }) => ({
  alignItems: 'flex-start',
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
}))

const TitleSC = styled.h2(({ theme }) => ({
  color: theme.colors.text,
  fontFamily: theme.fontFamilies.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  margin: 0,
}))

const ColumnsSC = styled.div(({ theme }) => ({
  containerType: 'inline-size',
  display: 'grid',
  gap: theme.spacing.large,
  gridTemplateColumns: '1fr',
  marginTop: theme.spacing.large,
  [`@container (min-width: 960px)`]: {
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
  },
}))

const DefinitionCardSC = styled(Card)(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const DefinitionHeaderSC = styled.div({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
})

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  width: '100%',
}))

const QueryHeaderSC = styled.div({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
})

const QueryBlockSC = styled.pre(({ theme }) => ({
  ...theme.partials.text.code,
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-xlight'],
  margin: 0,
  overflowX: 'auto',
  padding: theme.spacing.medium,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}))

const FiresWhenSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
}))

const ChipsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.large,
}))

const FireChipSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xxsmall,
}))

const ChartWrapSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-accent'],
  borderRadius: theme.borderRadiuses.medium,
  height: CHART_HEIGHT_PX,
  marginTop: theme.spacing.xsmall,
  overflow: 'hidden',
  padding: theme.spacing.medium,
  width: '100%',
}))

const GraphWrapperSC = styled.div({
  height: '100%',
  width: '100%',
})

const RecentSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minWidth: 0,
}))

const JobsGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.medium,
  gridTemplateColumns: '1fr',
  [`@container (min-width: 960px)`]: {
    gridTemplateColumns: '1fr',
  },
}))

const EmptyJobsSC = styled(Card)(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  padding: theme.spacing.medium,
}))

const JobCardSC = styled(Card)(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 140,
  padding: theme.spacing.medium,
  textDecoration: 'none',
}))
