import {
  Button,
  Card,
  Chip,
  ChipSeverity,
  DocsIcon,
  EmptyState,
  ErrorIcon,
  ExpandIcon,
  Flex,
  GearTrainIcon,
  HamburgerMenuCollapsedIcon,
  IconFrame,
  Markdown,
  Modal,
  PaperCheckIcon,
  PrClosedIcon,
  PrIcon,
  Tooltip,
  useResizeObserver,
} from '@pluralsh/design-system'
import { Line } from '@nivo/line'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { alertSeverityToChipSeverity } from 'components/utils/alerts/AlertsTable'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, Body2P, CaptionP } from 'components/utils/typography/Text'
import { evalGradeToColor } from 'components/workbenches/common/evalGrade'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import { cronToExplanation } from 'components/workbenches/workbench/crons/utils'
import {
  AlertState,
  Delta,
  InputMaybe,
  LogQueryOperator,
  MonitorAggregate,
  MonitorType,
  PrStatus,
  useLogAggregationBucketsQuery,
  useWorkbenchMonitorJobsQuery,
  useWorkbenchMonitorDeltaSubscription,
  useWorkbenchMonitorPreviewQuery,
  useWorkbenchMonitorQuery,
  WorkbenchJobStatus,
  WorkbenchJobTinyFragment,
  WorkbenchMonitorDetailsFragment,
} from 'generated/graphql'
import { isEmpty, isNil, times, upperFirst } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  getWorkbenchEvalResultAbsPath,
  getWorkbenchJobAbsPath,
  getWorkbenchMonitoringMonitorSettingsAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { keyframes, useTheme } from 'styled-components'
import { COLORS } from 'utils/color'
import {
  formatMinutesAsDuration,
  fromNow,
  parseDurationToMinutes,
  toDateOrUndef,
} from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { MonitoringDetailSkeleton } from './WorkbenchDashboardDetail'
import { DashboardToolIcon, toolDisplayName } from './dashboardToolIcon'
import { monitorDefinitionYaml } from './definitionYaml'
import { ExitFullscreenButton } from './ExitFullscreenButton'
import { QueryDefinitionModal } from './QueryDefinitionModal'
import {
  DefinitionPanelShell,
  useDefinitionPanelContainer,
  WorkbenchMonitoringDefinitionPanel,
} from './WorkbenchMonitoringDefinitionPanel'
import { WorkbenchMonitoringSharePopover } from './WorkbenchMonitoringSharePopover'

const CHART_HEIGHT_PX = 280
const RECENT_JOBS_COUNT = 6

function recentJobTime(date: string) {
  const elapsedMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(elapsedMs)) return ''
  const minutes = Math.max(0, Math.round(elapsedMs / 60_000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function MonitorDetail({
  monitorId,
  onUpdate,
}: {
  monitorId: string
  onUpdate?: () => void
}) {
  const { data, loading, error } = useWorkbenchMonitorQuery({
    variables: { id: monitorId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const { data: deltaData } = useWorkbenchMonitorDeltaSubscription({
    variables: { id: monitorId },
  })
  const event = deltaData?.workbenchMonitorDelta
  const monitor =
    event?.delta === Delta.Delete ? null : (event?.payload ?? data?.monitor)

  if (loading && !monitor) return <MonitoringDetailSkeleton />
  if (error) return <GqlError error={error} />
  if (!monitor)
    return (
      <MainSC>
        <EmptyState message="Monitor not found." />
      </MainSC>
    )

  return (
    <MonitorDetailView
      key={monitor.updatedAt ?? monitor.id}
      monitor={monitor}
      onUpdate={onUpdate}
    />
  )
}

function MonitorDetailView({
  monitor,
  onUpdate,
}: {
  monitor: WorkbenchMonitorDetailsFragment
  onUpdate?: () => void
}) {
  const workbenchId = monitor.workbench?.id
  const activeQuery =
    monitor.type === MonitorType.Metrics
      ? monitor.query?.metrics
      : monitor.query?.log
  const queryText = activeQuery?.query
  const toolName = activeQuery?.tool
  const forDuration = activeQuery?.duration
  const { pathname } = useLocation()
  const [definitionOpen, setDefinitionOpen] = useState(false)
  const [queryOpen, setQueryOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const fullscreenTriggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useDefinitionPanelContainer()
  const definitionYaml = useMemo(
    () => monitorDefinitionYaml(monitor),
    [monitor]
  )
  const jobsQuery = useMonitorJobs(workbenchId, monitor.id)
  const investigatingJob = jobsQuery.jobs.find((job) =>
    INVESTIGATING_JOB_STATUSES.has(job.status)
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

  const main = (
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
            {workbenchId &&
              (monitor.type === MonitorType.Log ? (
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
              ) : (
                <Tooltip
                  label="Manual settings are only available for log monitors."
                  placement="top"
                >
                  <SettingsTooltipTriggerSC>
                    <IconFrame
                      clickable
                      disabled
                      size="small"
                      type="tertiary"
                      icon={<GearTrainIcon />}
                      textValue="Monitor settings"
                    />
                  </SettingsTooltipTriggerSC>
                </Tooltip>
              ))}
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
      <ScrollSC>
        <BodySC>
          {monitor.state === AlertState.Firing && (
            <FiringBanner
              name={monitor.name}
              job={investigatingJob}
              workbenchId={workbenchId}
            />
          )}
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
                    icon={<DocsIcon />}
                    textValue="Query"
                    onClick={() => setQueryOpen(true)}
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
                <QueryBlockSC
                  $nowrap={!!queryText && !queryText.includes('\n')}
                >
                  {queryText || '—'}
                </QueryBlockSC>
              </SectionSC>
              <SectionSC>
                <FiresWhenSC>
                  <Body2P $color="text-xlight">Fires when</Body2P>
                  <ChipsSC>
                    <FireChip
                      label="Condition"
                      value={conditionLabel(monitor.threshold)}
                      severity="success"
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
                      value={upperFirst(monitor.severity.toLowerCase())}
                      severity={alertSeverityToChipSeverity[monitor.severity]}
                    />
                  </ChipsSC>
                </FiresWhenSC>
                <ChartWrapSC>
                  <MonitorThresholdChart monitor={monitor} />
                </ChartWrapSC>
              </SectionSC>
            </DefinitionCardSC>
            {workbenchId && <MonitorRecentJobs query={jobsQuery} />}
          </ColumnsSC>
        </BodySC>
      </ScrollSC>
    </MainSC>
  )

  return (
    <DefinitionPanelShell
      containerRef={containerRef}
      panel={
        <WorkbenchMonitoringDefinitionPanel
          open={definitionOpen && !fullscreen}
          onClose={() => setDefinitionOpen(false)}
          yaml={definitionYaml}
          containerRef={containerRef}
        />
      }
    >
      {fullscreen ? createPortal(main, document.body) : main}
      <QueryDefinitionModal
        open={queryOpen}
        onClose={() => setQueryOpen(false)}
        title={monitor.name}
        query={queryText || '—'}
        onUpdate={onUpdate}
      />
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
  const isMetrics = monitor.type === MonitorType.Metrics

  if (isMetrics) {
    return (
      <MetricsThresholdPreview
        monitorId={monitor.id}
        threshold={monitor.threshold}
        emptyDescription={
          monitor.query?.metrics?.query
            ? `Query: ${monitor.query.metrics.query} · fires when ${conditionLabel(monitor.threshold)}${
                monitor.query.metrics.duration
                  ? ` for ${forLabel(monitor.query.metrics.duration)}`
                  : ''
              }`
            : undefined
        }
      />
    )
  }

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

function MetricsThresholdPreview({
  monitorId,
  threshold,
  emptyDescription,
}: {
  monitorId: string
  threshold: { aggregate: MonitorAggregate; value: number }
  emptyDescription?: string
}) {
  const graphTheme = useGraphTheme()
  const { colors } = useTheme()
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useWorkbenchMonitorPreviewQuery({
    variables: { id: monitorId },
    fetchPolicy: 'cache-and-network',
  })
  const data = currentData ?? previousData

  const graphData = useMemo(() => {
    const metrics = data?.monitor?.preview?.metrics?.filter(isNonNullable) ?? []
    return [
      {
        id: 'Metric',
        data: metrics
          .map((m) => {
            // :long arrives as a string over the wire
            const ts = m.timestamp != null ? Number(m.timestamp) : NaN
            const value = m.value != null ? parseFloat(m.value) : NaN
            if (Number.isNaN(ts) || Number.isNaN(value)) return null
            return { x: new Date(ts * 1000), y: value }
          })
          .filter((point): point is { x: Date; y: number } => point != null),
      },
    ]
  }, [data])

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
  if (error && !data) return <GqlError error={error} />
  if (isEmpty(graphData[0].data))
    return (
      <EmptyState
        message="No metric data found for this query."
        description={emptyDescription}
      />
    )

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
          yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
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
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useLogAggregationBucketsQuery({
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
  const data = currentData ?? previousData

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
  if (error && !data) return <GqlError error={error} />
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

const INVESTIGATING_JOB_STATUSES = new Set<WorkbenchJobStatus>([
  WorkbenchJobStatus.Pending,
  WorkbenchJobStatus.Paused,
  WorkbenchJobStatus.Running,
])

function useMonitorJobs(workbenchId: string | undefined, monitorId: string) {
  const result = useWorkbenchMonitorJobsQuery({
    skip: !workbenchId,
    variables: {
      id: workbenchId ?? '',
      monitorId,
      first: RECENT_JOBS_COUNT,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const data = result.data ?? result.previousData
  const jobs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  return { ...result, data, jobs }
}

function FiringBanner({
  name,
  job,
  workbenchId,
}: {
  name: string
  job?: WorkbenchJobTinyFragment
  workbenchId?: string
}) {
  const jobWorkbenchId = job?.workbench?.id ?? workbenchId
  const jobPath =
    job && jobWorkbenchId
      ? getWorkbenchJobAbsPath({
          workbenchId: jobWorkbenchId,
          jobId: job.id,
        })
      : null

  return (
    <FiringBannerSC>
      <FiringBannerMessageSC>
        <FiringDotSC aria-hidden />
        <FiringBannerTextSC>
          {name} is firing
          {job ? ', a workbench job is already investigating' : ''}
        </FiringBannerTextSC>
      </FiringBannerMessageSC>
      {jobPath && (
        <OpenWorkbenchLinkSC to={jobPath}>Open workbench</OpenWorkbenchLinkSC>
      )}
    </FiringBannerSC>
  )
}

function MonitorRecentJobs({
  query,
}: {
  query: ReturnType<typeof useMonitorJobs>
}) {
  const { data, loading, error, jobs } = query

  return (
    <RecentSectionSC>
      <SectionTitleSC>Recent jobs</SectionTitleSC>
      {error && <GqlError error={error} />}
      {!data && loading ? (
        <JobsGridSC>
          {times(3, (i) => (
            <RectangleSkeleton
              key={i}
              $height={140}
              $width="100%"
            />
          ))}
        </JobsGridSC>
      ) : isEmpty(jobs) ? (
        <EmptyJobsSC>
          <Body2P
            $color="text-light"
            css={{ margin: 0, textAlign: 'center' }}
          >
            No recent jobs yet, this job has not fired
          </Body2P>
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
    <JobCardSC to={getWorkbenchJobAbsPath({ workbenchId, jobId: job.id })}>
      <JobMetaSC>
        <MonitorJobStatus status={job.status} />
        <CaptionP
          $color="text-xlight"
          css={{ margin: 0, whiteSpace: 'nowrap' }}
        >
          {job.insertedAt ? recentJobTime(job.insertedAt) : ''}
        </CaptionP>
      </JobMetaSC>
      <JobPromptSC>{job.prompt || '—'}</JobPromptSC>
      <CaptionP
        $color="text-xlight"
        css={{
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {job.user?.name ?? '—'}
      </CaptionP>
      <MonitorJobFooter job={job} />
    </JobCardSC>
  )
}

function MonitorJobStatus({
  status,
}: {
  status: WorkbenchJobTinyFragment['status']
}) {
  if (
    status === WorkbenchJobStatus.Running ||
    status === WorkbenchJobStatus.Pending
  )
    return <RunningSpinner />

  return (
    <RunStatusIcon
      fullColor
      status={status}
    />
  )
}

function RunningSpinner() {
  const theme = useTheme()

  return (
    <RunningSpinnerSC
      viewBox="0 0 14 14.0001"
      fill="none"
      aria-hidden
    >
      <path
        d="M2.01749 7.4203C2.06566 7.99143 2.21227 8.55051 2.45044 9.07319C2.72273 9.67067 3.11016 10.2086 3.59037 10.6564C4.07059 11.1042 4.63426 11.4532 5.24929 11.6832C5.86426 11.9131 6.51836 12.0199 7.1745 11.997C7.83064 11.9741 8.47569 11.8219 9.07313 11.5496C9.67062 11.2773 10.2086 10.8899 10.6564 10.4097C11.1042 9.92947 11.4531 9.3658 11.6831 8.75077C11.913 8.1358 12.0199 7.4817 11.997 6.82556C11.974 6.16942 11.8218 5.52437 11.5496 4.92693C11.2773 4.32944 10.8898 3.79149 10.4096 3.34368C9.92942 2.89588 9.36574 2.54692 8.75072 2.31697C8.13575 2.08707 7.48164 1.98019 6.8255 2.0031C6.16936 2.02602 5.52431 2.17826 4.92688 2.4505C4.32939 2.72279 3.79143 3.11022 3.34362 3.59043C2.89582 4.07064 2.54686 4.63432 2.31691 5.24934C2.11578 5.78736 2.00853 6.3553 2.00032 6.92841L2.00305 7.17456L2.01749 7.4203ZM0.00105338 6.90051C0.0124701 6.09781 0.161921 5.30221 0.443659 4.54867C0.765588 3.68765 1.25315 2.89792 1.88006 2.22564C2.50698 1.55336 3.26078 1.01189 4.09724 0.630687C4.93372 0.249479 5.83701 0.0364045 6.75571 0.00432295C7.6744 -0.0277585 8.59035 0.121787 9.45139 0.443716C10.3124 0.765645 11.1021 1.25321 11.7744 1.88012C12.4467 2.50703 12.9882 3.26083 13.3694 4.09729C13.7506 4.93378 13.9637 5.83707 13.9957 6.75576C14.0278 7.67446 13.8783 8.59041 13.5563 9.45145C13.2344 10.3125 12.7469 11.1022 12.1199 11.7745C11.493 12.4468 10.7392 12.9882 9.90277 13.3694C9.06628 13.7506 8.16299 13.9637 7.2443 13.9958C6.32561 14.0279 5.40965 13.8783 4.54861 13.5564C3.6876 13.2345 2.89786 12.7469 2.22558 12.12C1.5533 11.4931 1.01184 10.7393 0.63063 9.90283C0.249423 9.06634 0.036348 8.16305 0.00426638 7.24436L0.00105338 6.90051Z"
        fill={theme.colors['border-fill-two']}
      />
      <path
        d="M2.00305 7.17456C2.02232 7.72651 1.5905 8.18957 1.03856 8.20885C0.48661 8.22812 0.0235412 7.7963 0.00426673 7.24436C-0.0342823 6.14045 0.188826 5.04304 0.655596 4.04194C1.12245 3.04077 1.82012 2.16411 2.69061 1.48401C3.56108 0.803963 4.58033 0.339184 5.66465 0.128414C6.74892 -0.0822906 7.86767 -0.03306 8.92944 0.271397C9.46032 0.423636 9.76684 0.97712 9.61461 1.508C9.46238 2.03889 8.90893 2.34638 8.37804 2.19416C7.61956 1.97667 6.82045 1.94134 6.0459 2.09189C5.27145 2.24244 4.54387 2.57446 3.92215 3.06015C3.30037 3.54594 2.8019 4.17227 2.46843 4.88739C2.13508 5.60242 1.97552 6.38612 2.00305 7.17456Z"
        fill={theme.colors['icon-secondary']}
      />
    </RunningSpinnerSC>
  )
}

function MonitorJobFooter({ job }: { job: WorkbenchJobTinyFragment }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const prs = job.pullRequests?.filter((pr) => pr != null) ?? []
  const grade = job.evalResult?.grade
  const workbenchId = job.workbench?.id
  const singlePr = prs.length === 1 ? prs[0] : null

  return (
    <JobFooterSC
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {job.result?.conclusion && (
        <ConclusionButton conclusion={job.result.conclusion} />
      )}
      {singlePr && (
        <IconFrame
          clickable
          size="medium"
          type="tertiary"
          textValue="Pull request"
          icon={
            singlePr.status === PrStatus.Open ? (
              <PrIcon color="icon-light" />
            ) : (
              <PrClosedIcon color="icon-light" />
            )
          }
          onClick={() =>
            window.open(singlePr.url, '_blank', 'noopener,noreferrer')
          }
        />
      )}
      {prs.length > 1 && (
        <PrCountSC>
          <span css={{ color: theme.colors['text-xlight'] }}>{prs.length}</span>
          <span css={{ color: theme.colors['text-light'] }}>PRs</span>
        </PrCountSC>
      )}
      {grade != null && workbenchId && job.evalResult?.id && (
        <GradeSC
          type="button"
          $color={evalGradeToColor(grade)}
          onClick={() =>
            navigate(
              getWorkbenchEvalResultAbsPath({
                workbenchId,
                evalResultId: job.evalResult?.id ?? '',
              })
            )
          }
        >
          {Math.round(grade)}
        </GradeSC>
      )}
      {job.alert?.state === AlertState.Firing && (
        <JobMetaChipSC
          {...(job.alert.url
            ? {
                as: 'a' as const,
                href: job.alert.url,
                target: '_blank',
                rel: 'noopener noreferrer',
              }
            : {})}
        >
          <ErrorIcon
            color="icon-light"
            size={12}
          />
          Firing
        </JobMetaChipSC>
      )}
      {job.issue && (
        <IssueStatusChip
          status={job.issue.status}
          {...(job.issue.url
            ? {
                as: 'a' as const,
                href: job.issue.url,
                target: '_blank',
                rel: 'noopener noreferrer',
              }
            : {})}
        />
      )}
    </JobFooterSC>
  )
}

function ConclusionButton({ conclusion }: { conclusion: string }) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        clickable
        size="medium"
        type="tertiary"
        tooltip="View conclusion"
        textValue="View conclusion"
        icon={<PaperCheckIcon color="icon-xlight" />}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      />
      <Modal
        header="Conclusion"
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        actions={
          <Button
            secondary
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        }
      >
        <Card css={{ padding: theme.spacing.large, overflow: 'auto' }}>
          <Markdown text={conclusion} />
        </Card>
      </Modal>
    </>
  )
}

function FireChip({
  label,
  value,
  severity = 'neutral',
}: {
  label: string
  value: string
  severity?: ChipSeverity
}) {
  return (
    <FireChipSC>
      <CaptionP $color="text-input-disabled">{label}</CaptionP>
      <Chip
        size="small"
        severity={severity}
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
  const minutes = parseDurationToMinutes(duration)
  if (minutes == null) return duration
  return formatMinutesAsDuration(minutes) || duration
}

function evaluateLabel(cron: string) {
  try {
    return cronToExplanation({ crontab: cron }).replace(/, next at.*$/, '')
  } catch {
    return cron
  }
}

const MainSC = styled.div<{ $fullscreen?: boolean }>(
  ({ theme, $fullscreen }) => ({
    containerName: 'monitor-detail',
    containerType: 'inline-size',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
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
  backgroundColor: theme.colors['fill-one-selected'],
  borderBottom: theme.borders.default,
  borderTop: theme.borders.default,
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.small,
  height: 40,
  justifyContent: 'space-between',
  padding: `0 ${theme.spacing.medium}px`,
  // Above the tab strip (z-index 1) without trapping fullscreen stacking.
  position: 'relative',
  zIndex: 2,
}))

const StripActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
}))

const SettingsTooltipTriggerSC = styled.span({
  cursor: 'not-allowed',
  display: 'inline-flex',
  '& > *': { pointerEvents: 'none' },
})

const EyebrowSC = styled.p(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  margin: 0,
}))

const ScrollSC = styled.div({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
})

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  // Padding lives on the scroll child — flex scroll containers drop
  // padding-bottom from the scrollable overflow area.
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  paddingBottom: theme.spacing.xlarge,
}))

const FiringBannerSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  backgroundColor: theme.colors.red[900],
  border: `0.75px solid ${theme.colors.red[800]}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  gap: theme.spacing.xsmall,
  marginBottom: theme.spacing.large,
  padding: theme.spacing.xsmall,
}))

const FiringBannerMessageSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const FiringDotSC = styled.span(({ theme }) => ({
  backgroundColor: theme.colors['icon-danger'],
  borderRadius: 5,
  flexShrink: 0,
  height: 10,
  width: 10,
}))

const FiringBannerTextSC = styled.p(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors.text,
  margin: 0,
  minWidth: 0,
}))

const OpenWorkbenchLinkSC = styled(Link)(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-primary-accent'],
  flexShrink: 0,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  '&:hover, &:visited': {
    color: theme.colors['text-primary-accent'],
  },
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
  display: 'grid',
  gap: theme.spacing.large,
  gridTemplateColumns: 'minmax(0, 1fr)',
  marginTop: theme.spacing.large,
  minWidth: 0,
  '@container monitor-detail (min-width: 960px)': {
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
  },
}))

const DefinitionCardSC = styled(Card)(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minWidth: 0,
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

const QueryBlockSC = styled.pre<{ $nowrap?: boolean }>(
  ({ theme, $nowrap }) => ({
    ...theme.partials.text.code,
    backgroundColor: theme.colors['fill-two'],
    border: theme.borders['fill-two'],
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['text-xlight'],
    margin: 0,
    maxWidth: '100%',
    minWidth: 0,
    overflowX: 'auto',
    padding: theme.spacing.medium,
    whiteSpace: $nowrap ? 'pre' : 'pre-wrap',
    wordBreak: $nowrap ? 'normal' : 'break-word',
  })
)

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
  containerName: 'recent-jobs',
  containerType: 'inline-size',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  minWidth: 0,
}))

const SectionTitleSC = styled.h3(({ theme }) => ({
  color: theme.colors.text,
  fontFamily: theme.fontFamilies.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  margin: 0,
}))

const JobsGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.small,
  gridTemplateColumns: 'minmax(0, 1fr)',
  '@container recent-jobs (min-width: 560px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '@container recent-jobs (min-width: 840px)': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
}))

const EmptyJobsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  border: `1px dashed ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.large,
  boxSizing: 'border-box',
  display: 'flex',
  justifyContent: 'center',
  maxWidth: 456,
  minHeight: 72,
  padding: theme.spacing.medium,
  width: '100%',
}))

const JobCardSC = styled(Link)(({ theme }) => ({
  backgroundColor: theme.colors['fill-one-raised'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minWidth: 0,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
}))

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const RunningSpinnerSC = styled.svg`
  animation: ${spin} 1s linear infinite;
  display: block;
  flex-shrink: 0;
  height: 16px;
  width: 16px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const JobMetaSC = styled.div({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
})

const JobPromptSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  display: '-webkit-box',
  height: 40,
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '100%',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
}))

const JobFooterSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
  minWidth: 0,
}))

const JobMetaChipSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one-raised'],
  border: `0.75px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  boxSizing: 'border-box',
  color: theme.colors.text,
  display: 'inline-flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
  padding: '2px 8px',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  '&:hover, &:visited': {
    color: theme.colors.text,
  },
}))

const PrCountSC = styled(JobMetaChipSC)(({ theme }) => ({
  backgroundColor: 'transparent',
  gap: theme.spacing.xxxsmall,
  letterSpacing: 0,
}))

const GradeSC = styled.button<{ $color: string }>(({ theme, $color }) => ({
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one-raised'],
  border: `1px solid ${theme.colors['border-fill-two']}`,
  borderRadius: '50%',
  boxSizing: 'border-box',
  color: $color,
  cursor: 'pointer',
  display: 'flex',
  flexShrink: 0,
  fontFamily: theme.fontFamilies.sans,
  fontSize: 8,
  fontWeight: 700,
  height: 24,
  justifyContent: 'center',
  lineHeight: '8px',
  padding: 0,
  width: 24,
}))
