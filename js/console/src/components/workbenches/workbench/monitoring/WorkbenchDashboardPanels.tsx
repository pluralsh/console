import {
  Card,
  CloseIcon,
  DocsIcon,
  EmptyState,
  ExpandIcon,
  Flex,
  IconFrame,
  InfoIcon,
  ModalWrapper,
  Tooltip,
} from '@pluralsh/design-system'
import { ChatMarkdown } from 'components/ai/chatbot/ChatMarkdown'
import { GqlError } from 'components/utils/Alert'
import { MetricsSection } from 'components/utils/metrics/MetricsSection'
import { PieChart } from 'components/utils/PieChart'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { Body1P, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  DashboardGraphType,
  DashboardGraphUnit,
  DashboardTimeRangeAttributes,
  useWorkbenchDashboardGraphQuery,
  WorkbenchDashboardDetailsFragment,
  WorkbenchJobActivityLogFragment,
  WorkbenchJobActivityMetricFragment,
  WorkbenchJobActivityTraceFragment,
} from 'generated/graphql'
import { groupBy, isEmpty, maxBy, sortBy } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityLogs,
  WorkbenchJobMetricsLegend,
} from '../job/WorkbenchJobActivityResults'
import { getMetricSeries, metricSeriesId } from '../job/workbenchJobMetrics'
import { TraceWaterfall } from '../job/WorkbenchJobTraces'
import { DashboardTimeseriesChart } from './DashboardTimeseriesChart'
import { DashboardToolIcon, toolDisplayName } from './dashboardToolIcon'
import { formatUnitValue } from './dashboardUnits'
import { QueryDefinitionModal } from './QueryDefinitionModal'

type DashboardGraph = NonNullable<
  NonNullable<WorkbenchDashboardDetailsFragment['graphs']>[number]
>

function datasourceQuery(input: unknown): string | null {
  const value = typeof input === 'string' ? parseJson(input) : input
  if (!value || typeof value !== 'object') return null
  const query = (value as { query?: unknown }).query
  return typeof query === 'string' && query.trim() ? query : null
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

const COLLAPSE_AT_PX = 640
const CHART_HEIGHT_PX = 238
const PIE_HEIGHT_PX = 200

type DashboardPanelsProps = {
  dashboardId: string
  graphs: DashboardGraph[]
  variables: Record<string, string>
  timeRange: DashboardTimeRangeAttributes
  rangeRevision: number
  queriesEnabled: boolean
  onRangeSelect?: (start: Date, end: Date) => void
  onUpdate?: () => void
}

export function WorkbenchDashboardPanels(props: DashboardPanelsProps) {
  const { graphs } = props
  const sections = useMemo(
    () =>
      sortBy(
        graphs.filter((graph) => graph.type === DashboardGraphType.Section),
        [(graph) => graph.layout?.y ?? 0, (graph) => graph.layout?.x ?? 0]
      ),
    [graphs]
  )
  const sectionIds = useMemo(
    () => new Set(sections.map((section) => section.identifier)),
    [sections]
  )
  const unsectioned = useMemo(
    () =>
      graphs.filter(
        (graph) =>
          graph.type !== DashboardGraphType.Section &&
          (!graph.sectionId || !sectionIds.has(graph.sectionId))
      ),
    [graphs, sectionIds]
  )

  if (graphs.length === 0) {
    return (
      <Card css={{ padding: 24 }}>
        <EmptyState message="No panels yet." />
      </Card>
    )
  }

  return (
    <StackSC>
      {unsectioned.length > 0 && (
        <DashboardGraphGrid
          {...props}
          graphs={unsectioned}
        />
      )}
      {sections.map((section) => (
        <DashboardSection
          key={section.identifier}
          section={section}
          {...props}
          graphs={graphs.filter(
            (graph) =>
              graph.type !== DashboardGraphType.Section &&
              graph.sectionId === section.identifier
          )}
        />
      ))}
    </StackSC>
  )
}

function DashboardSection({
  section,
  ...props
}: DashboardPanelsProps & { section: DashboardGraph }) {
  return (
    <MetricsSection
      title={section.title || section.identifier}
      description={section.description}
      defaultOpen={!isDefaultCollapsed(section.options)}
    >
      {props.graphs.length > 0 ? (
        <DashboardGraphGrid {...props} />
      ) : (
        <EmptyState message="No panels in this section." />
      )}
    </MetricsSection>
  )
}

function DashboardGraphGrid({
  dashboardId,
  graphs,
  variables,
  timeRange,
  rangeRevision,
  queriesEnabled,
  onRangeSelect,
  onUpdate,
}: DashboardPanelsProps) {
  const columns = useMemo(
    () =>
      Math.max(
        1,
        ...graphs.map(
          (graph) => (graph.layout?.x ?? 0) + (graph.layout?.w ?? 1)
        )
      ),
    [graphs]
  )

  const rows = useMemo(() => {
    const grouped = groupBy(graphs, (graph) => graph.layout?.y ?? 0)
    return sortBy(
      Object.entries(grouped).map(([yKey, rowGraphs]) => ({
        y: Number(yKey),
        graphs: sortBy(rowGraphs, (graph) => graph.layout?.x ?? 0),
      })),
      'y'
    )
  }, [graphs])

  return (
    <GraphGridSC>
      {rows.map(({ y, graphs: rowGraphs }) => (
        <RowSC
          key={y}
          $columns={columns}
        >
          {rowGraphs.map((graph) => (
            <CellSC
              key={graph.identifier}
              $x={graph.layout?.x ?? 0}
              $w={graph.layout?.w ?? columns}
            >
              <DashboardPanel
                dashboardId={dashboardId}
                graph={graph}
                variables={variables}
                timeRange={timeRange}
                rangeRevision={rangeRevision}
                queriesEnabled={queriesEnabled}
                onRangeSelect={onRangeSelect}
                onUpdate={onUpdate}
              />
            </CellSC>
          ))}
        </RowSC>
      ))}
    </GraphGridSC>
  )
}

function isDefaultCollapsed(options: unknown) {
  const value = typeof options === 'string' ? parseJson(options) : options
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { collapsed?: unknown }).collapsed === true
  )
}

type DashboardPanelProps = {
  dashboardId: string
  graph: DashboardGraph
  variables: Record<string, string>
  timeRange: DashboardTimeRangeAttributes
  rangeRevision: number
  queriesEnabled: boolean
  onRangeSelect?: (start: Date, end: Date) => void
  onUpdate?: () => void
}

function DashboardPanel(props: DashboardPanelProps) {
  if (props.graph.type === DashboardGraphType.Markdown) {
    return (
      <PanelCardSC $fullscreen={false}>
        <PanelBodySC>
          <ChatMarkdown text={props.graph.markdown || '_No content._'} />
        </PanelBodySC>
      </PanelCardSC>
    )
  }

  return <DataDashboardPanel {...props} />
}

function DataDashboardPanel({
  dashboardId,
  graph,
  variables,
  timeRange,
  rangeRevision,
  queriesEnabled,
  onRangeSelect,
  onUpdate,
}: DashboardPanelProps) {
  const needsFetch = dashboardGraphNeedsFetch(
    graph.type,
    !!graph.datasource,
    queriesEnabled
  )
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useWorkbenchDashboardGraphQuery({
    variables: {
      id: dashboardId,
      identifier: graph.identifier,
      input: JSON.stringify(variables),
      timeRange,
    },
    skip: !needsFetch,
    fetchPolicy: 'cache-and-network',
  })
  const [dataRevision, setDataRevision] = useState(rangeRevision)
  if (currentData && dataRevision !== rangeRevision)
    setDataRevision(rangeRevision)
  const data = dashboardPanelVisibleData({
    currentData,
    previousData,
    rangeRevision,
    dataRevision,
  })

  const query = datasourceQuery(graph.datasource?.input)
  const [queryOpen, setQueryOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const fullscreenTriggerRef = useRef<HTMLDivElement>(null)
  const result = data?.workbenchDashboard?.graph
  const metrics = result?.metrics?.filter(isNonNullable) ?? []
  const logs = result?.logs?.filter(isNonNullable) ?? []
  const traces = result?.traces?.filter(isNonNullable) ?? []
  const tool = graph.datasource?.tool
  const toolType = graph.workbenchTool?.tool ?? tool
  const toolName =
    graph.workbenchTool?.name ?? (tool ? toolDisplayName(tool) : null)

  const panel = (
    <PanelCardSC $fullscreen={fullscreen}>
      <PanelHeaderSC>
        <Flex
          direction="column"
          gap="xxsmall"
          minWidth={0}
          flex={1}
        >
          <PanelTitleSC>{graph.title || graph.identifier}</PanelTitleSC>
          {toolName && <CaptionP $color="text-xlight">{toolName}</CaptionP>}
        </Flex>
        <PanelActionsSC>
          {fullscreen ? (
            <IconFrame
              clickable
              size="small"
              type="tertiary"
              icon={<CloseIcon />}
              textValue="Close full screen"
              tooltip="Close full screen"
              onClick={() => setFullscreen(false)}
            />
          ) : (
            <IconFrame
              ref={fullscreenTriggerRef}
              clickable
              size="small"
              type="tertiary"
              icon={<ExpandIcon size={16} />}
              textValue="Full screen"
              tooltip="Full screen"
              onClick={() => setFullscreen(true)}
            />
          )}
          {query ? (
            <IconFrame
              clickable
              size="small"
              type="tertiary"
              icon={
                toolType ? (
                  <DashboardToolIcon
                    tool={toolType}
                    size={16}
                    fallback
                  />
                ) : (
                  <DocsIcon />
                )
              }
              textValue="Query"
              onClick={() => setQueryOpen(true)}
            />
          ) : (
            graph.description && (
              <Tooltip
                label={graph.description}
                placement="top"
              >
                <IconFrame
                  size="small"
                  type="tertiary"
                  icon={<InfoIcon />}
                  textValue={graph.description}
                />
              </Tooltip>
            )
          )}
        </PanelActionsSC>
      </PanelHeaderSC>
      <PanelBodySC aria-busy={loading}>
        {!graph.datasource ? (
          <EmptyState message="This panel has no data source." />
        ) : dashboardPanelIsWaitingForData({
            queriesEnabled,
            loading,
            hasData: !!data,
          }) ? (
          <DashboardPanelSkeleton fullscreen={fullscreen} />
        ) : error && !data ? (
          <GqlError
            error={error}
            css={{ wordBreak: 'break-word' }}
          />
        ) : (
          <PanelContent
            type={graph.type}
            unit={graph.unit}
            metrics={metrics}
            logs={logs}
            traces={traces}
            fullscreen={fullscreen}
            timeRange={timeRange}
            onRangeSelect={
              onRangeSelect &&
              ((start, end) => {
                setFullscreen(false)
                onRangeSelect(start, end)
              })
            }
            selectedSeriesId={selectedSeriesId}
            onSelectSeries={(id) =>
              setSelectedSeriesId((selected) => (selected === id ? null : id))
            }
          />
        )}
      </PanelBodySC>
      {graph.description && (
        <CaptionP $color="text-xlight">{graph.description}</CaptionP>
      )}
    </PanelCardSC>
  )

  return (
    <>
      {!fullscreen && panel}
      <ModalWrapper
        open={fullscreen}
        onOpenChange={setFullscreen}
        title={graph.title || graph.identifier}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          requestAnimationFrame(() => fullscreenTriggerRef.current?.focus())
        }}
        css={{
          height: 'min(900px, 100%)',
          maxHeight: '100%',
          overflow: 'hidden',
          width: 'min(1500px, 100%)',
        }}
      >
        {fullscreen && panel}
      </ModalWrapper>
      {query && (
        <QueryDefinitionModal
          open={queryOpen}
          onClose={() => setQueryOpen(false)}
          title={graph.title || graph.identifier}
          query={query}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}

export function dashboardGraphNeedsFetch(
  type: DashboardGraphType,
  hasDatasource: boolean,
  queriesEnabled: boolean
) {
  return queriesEnabled && type !== DashboardGraphType.Markdown && hasDatasource
}

/**
 * Live ticks and filter changes keep showing the previous result while
 * refetching; a user-initiated range change drops it so the panel goes back
 * to its skeleton rather than animating stale series into the new axis.
 */
export function dashboardPanelVisibleData<T>({
  currentData,
  previousData,
  rangeRevision,
  dataRevision,
}: {
  currentData: T | undefined
  previousData: T | undefined
  rangeRevision: number
  dataRevision: number
}) {
  if (currentData) return currentData
  return dataRevision === rangeRevision ? previousData : undefined
}

export function dashboardPanelIsWaitingForData({
  queriesEnabled,
  loading,
  hasData,
}: {
  queriesEnabled: boolean
  loading: boolean
  hasData: boolean
}) {
  return !queriesEnabled || (loading && !hasData)
}

function DashboardPanelSkeleton({ fullscreen }: { fullscreen: boolean }) {
  return (
    <SkeletonStackSC
      role="status"
      aria-label="Loading dashboard panel data"
    >
      <RectangleSkeleton
        $height={fullscreen ? 560 : CHART_HEIGHT_PX}
        $width="100%"
      />
      <Flex
        gap="small"
        wrap="wrap"
      >
        <RectangleSkeleton
          $height={12}
          $width={120}
        />
        <RectangleSkeleton
          $height={12}
          $width={160}
        />
        <RectangleSkeleton
          $height={12}
          $width={96}
        />
      </Flex>
    </SkeletonStackSC>
  )
}

function PanelContent({
  type,
  unit,
  metrics,
  logs,
  traces,
  fullscreen,
  timeRange,
  onRangeSelect,
  selectedSeriesId,
  onSelectSeries,
}: {
  type: DashboardGraphType
  unit: Nullable<DashboardGraphUnit>
  metrics: WorkbenchJobActivityMetricFragment[]
  logs: WorkbenchJobActivityLogFragment[]
  traces: WorkbenchJobActivityTraceFragment[]
  fullscreen: boolean
  timeRange: DashboardTimeRangeAttributes
  onRangeSelect?: (start: Date, end: Date) => void
  selectedSeriesId: string | null
  onSelectSeries: (id: string) => void
}) {
  const series = getMetricSeries(metrics)
  const selectedSeriesIndex = series.findIndex(
    ({ id }) => id === selectedSeriesId
  )
  const effectiveSelectedId = selectedSeriesIndex >= 0 ? selectedSeriesId : null
  const visibleMetrics = effectiveSelectedId
    ? metrics.filter((metric) => metricSeriesId(metric) === effectiveSelectedId)
    : metrics

  switch (type) {
    case DashboardGraphType.Logs:
      if (isEmpty(logs)) return <NoDataState />
      return (
        <JobActivityLogs
          logs={logs}
          variant="canvas"
        />
      )
    case DashboardGraphType.Traces:
      if (isEmpty(traces)) return <NoDataState />
      return <TraceWaterfall traces={traces} />
    case DashboardGraphType.Stat:
      return (
        <StatContent
          metrics={metrics}
          unit={unit}
        />
      )
    case DashboardGraphType.Pie:
      return <PieContent metrics={metrics} />
    case DashboardGraphType.Table:
      return (
        <TableContent
          metrics={metrics}
          unit={unit}
        />
      )
    case DashboardGraphType.Bar:
    case DashboardGraphType.Gauge:
    case DashboardGraphType.Heatmap:
    case DashboardGraphType.Timeseries:
    default:
      if (isEmpty(metrics)) return <NoDataState />
      return (
        <Flex
          direction="column"
          gap="xsmall"
          width="100%"
        >
          <DashboardTimeseriesChart
            metrics={visibleMetrics}
            timeWindow={{
              start: new Date(timeRange.start),
              end: new Date(timeRange.end),
            }}
            unit={unit}
            onRangeSelect={onRangeSelect}
            css={{
              height: fullscreen
                ? 'min(650px, calc(100vh - 260px))'
                : CHART_HEIGHT_PX,
            }}
            lineProps={{
              colors:
                selectedSeriesIndex >= 0
                  ? [COLORS[selectedSeriesIndex % COLORS.length]]
                  : COLORS,
            }}
          />
          <WorkbenchJobMetricsLegend
            series={series}
            maxHeight={fullscreen ? 160 : 88}
            selectedId={effectiveSelectedId}
            onSelect={onSelectSeries}
          />
        </Flex>
      )
  }
}

function StatContent({
  metrics,
  unit,
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
  unit: Nullable<DashboardGraphUnit>
}) {
  if (isEmpty(metrics)) return <NoDataState />
  const latest = maxBy(metrics, (metric) => metric.timestamp ?? '')
  const series = getMetricSeries(metrics)

  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <StatValueSC>
        {latest?.value != null ? formatStat(latest.value, unit) : '—'}
      </StatValueSC>
      {series[0] && (
        <Body2P
          $color="text-light"
          title={series[0].label}
        >
          {series[0].shortLabel}
        </Body2P>
      )}
    </Flex>
  )
}

function PieContent({
  metrics,
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
}) {
  if (isEmpty(metrics)) return <NoDataState />
  const series = getMetricSeries(metrics)
  const data = series.map((s, i) => ({
    id: s.id,
    label: s.label,
    value: s.data.at(-1)?.y ?? 0,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div css={{ width: '100%', minWidth: 0 }}>
      <PieChart
        data={data}
        height={PIE_HEIGHT_PX}
      />
    </div>
  )
}

function TableContent({
  metrics,
  unit,
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
  unit: Nullable<DashboardGraphUnit>
}) {
  if (isEmpty(metrics)) return <NoDataState />
  const series = getMetricSeries(metrics)

  return (
    <TableSC>
      <thead>
        <tr>
          <th>Series</th>
          <th>Latest</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {series.map((s) => (
          <tr key={s.id}>
            <td title={s.label}>{s.shortLabel}</td>
            <td>{formatLatest(s.data.at(-1)?.y, unit)}</td>
            <td>{s.data.length}</td>
          </tr>
        ))}
      </tbody>
    </TableSC>
  )
}

function NoDataState() {
  return <EmptyState message="No data for this filter and range." />
}

function hasUnit(unit: Nullable<DashboardGraphUnit>) {
  return !!unit && unit !== DashboardGraphUnit.None
}

function formatStat(value: number, unit: Nullable<DashboardGraphUnit>) {
  if (!Number.isFinite(value)) return '—'
  if (hasUnit(unit)) return formatUnitValue(value, unit)
  if (Math.abs(value) >= 1000) return value.toLocaleString()
  return String(Number(value.toPrecision(6)))
}

function formatLatest(value: unknown, unit: Nullable<DashboardGraphUnit>) {
  if (typeof value !== 'number') return value == null ? '—' : String(value)
  return hasUnit(unit) ? formatUnitValue(value, unit) : String(value)
}

const StackSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  width: '100%',
}))

const GraphGridSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  width: '100%',
}))

const RowSC = styled.div<{ $columns: number }>(({ theme, $columns }) => ({
  alignItems: 'start',
  containerType: 'inline-size',
  display: 'grid',
  gap: theme.spacing.medium,
  gridTemplateColumns: `repeat(${$columns}, minmax(0, 1fr))`,
  width: '100%',
  [`@container (max-width: ${COLLAPSE_AT_PX}px)`]: {
    gridTemplateColumns: '1fr',
  },
}))

const CellSC = styled.div<{ $x: number; $w: number }>(({ $x, $w }) => ({
  display: 'flex',
  flexDirection: 'column',
  gridColumn: `${Math.max(1, $x + 1)} / span ${Math.max(1, $w)}`,
  minWidth: 0,
  [`@container (max-width: ${COLLAPSE_AT_PX}px)`]: {
    gridColumn: '1 / -1',
  },
}))

const PanelCardSC = styled(Card)<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    backgroundColor: theme.colors['fill-zero'],
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    height: $fullscreen ? '100%' : 'auto',
    minWidth: 0,
    overflow: $fullscreen ? 'auto' : undefined,
    padding: theme.spacing.large,
    width: '100%',
  })
)

const PanelHeaderSC = styled.div({
  alignItems: 'flex-start',
  display: 'flex',
  gap: 16,
  width: '100%',
})

const PanelActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
}))

const PanelTitleSC = styled(Body1P)({
  ...TRUNCATE,
  margin: 0,
})

const PanelBodySC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minWidth: 0,
  width: '100%',
})

const SkeletonStackSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  width: '100%',
}))

const StatValueSC = styled.p(({ theme }) => ({
  ...theme.partials.text.title2,
  color: theme.colors.text,
  ...theme.partials.text.mono,
  margin: 0,
}))

const TableSC = styled.table(({ theme }) => ({
  ...theme.partials.text.caption,
  borderCollapse: 'collapse',
  color: theme.colors['text-light'],
  width: '100%',
  'th, td': {
    borderBottom: theme.borders.default,
    padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
    textAlign: 'left',
  },
  th: {
    color: theme.colors['text-xlight'],
    fontWeight: 600,
  },
}))
