import {
  CloseIcon,
  DocsIcon,
  ExpandIcon,
  Flex,
  IconFrame,
  ModalWrapper,
  useResizeObserver,
} from '@pluralsh/design-system'
import { WorkbenchEmptyState } from 'components/workbenches/common/WorkbenchEmptyState'
import { ChatMarkdown } from 'components/ai/chatbot/ChatMarkdown'
import { GqlError } from 'components/utils/Alert'
import GraphHeader from 'components/utils/GraphHeader'
import type { GraphLegendLayout } from 'components/utils/GraphLegend'
import { MetricsCard } from 'components/utils/metrics/MetricsCard'
import { MetricsSection } from 'components/utils/metrics/MetricsSection'
import { PieChart } from 'components/utils/PieChart'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  DashboardGraphType,
  DashboardGraphUnit,
  DashboardTimeRangeAttributes,
  WorkbenchJobActivityLogFragment,
  WorkbenchJobActivityTraceFragment,
} from 'generated/graphql'
import { groupBy, isEmpty, maxBy, sortBy } from 'lodash'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityLogs,
  WorkbenchJobMetricsLegend,
} from '../job/WorkbenchJobActivityResults'
import {
  getMetricSeriesFromResponses,
  type MetricSeries,
} from '../job/workbenchJobMetrics'
import { TraceWaterfall } from '../job/WorkbenchJobTraces'
import {
  DashboardPanelGraph,
  useDashboardGraphSource,
} from './DashboardGraphSource'
import { DashboardTimeseriesChart } from './DashboardTimeseriesChart'
import { DashboardToolIcon } from './dashboardToolIcon'
import { formatUnitValue } from './dashboardUnits'
import { QueryDefinitionModal } from './QueryDefinitionModal'

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
// narrow enough for ~4 unsquished time labels next to the y axis
const MIN_PANEL_WIDTH_PX = 280
const CHART_HEIGHT_PX = 238
const PIE_HEIGHT_PX = 200

type DashboardPanelsProps = {
  graphs: DashboardPanelGraph[]
  variables: Record<string, string>
  timeRange: DashboardTimeRangeAttributes
  rangeRevision: number
  queriesEnabled: boolean
  onRangeSelect?: (start: Date, end: Date) => void
  onUpdate?: () => void
  /** Minimum grid columns; otherwise each grid is as wide as its widest row. */
  columns?: number
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
      <WorkbenchEmptyState
        inset={false}
        message="No panels yet"
        description="Panels added to this dashboard will show up here."
      />
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
}: DashboardPanelsProps & { section: DashboardPanelGraph }) {
  return (
    <MetricsSection
      title={section.title || section.identifier}
      description={section.description}
      defaultOpen={!isDefaultCollapsed(section.options)}
    >
      {props.graphs.length > 0 ? (
        <DashboardGraphGrid {...props} />
      ) : (
        <WorkbenchEmptyState
          inset={false}
          message="No panels in this section"
          description="Panels added to this section will show up here."
        />
      )}
    </MetricsSection>
  )
}

function DashboardGraphGrid({
  graphs,
  variables,
  timeRange,
  rangeRevision,
  queriesEnabled,
  onRangeSelect,
  onUpdate,
  columns: minColumns = 1,
}: DashboardPanelsProps) {
  const columns = useMemo(
    () =>
      Math.max(
        minColumns,
        ...graphs.map(
          (graph) => (graph.layout?.x ?? 0) + (graph.layout?.w ?? 1)
        )
      ),
    [graphs, minColumns]
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
      {rows.map(({ y, graphs: rowGraphs }) => {
        const collapseAt = rowCollapseWidth(columns, rowGraphs)
        return (
          <RowSC
            key={y}
            $columns={columns}
            $collapseAt={collapseAt}
          >
            {rowGraphs.map((graph) => (
              <CellSC
                key={dashboardGraphDataKey(graph)}
                $x={graph.layout?.x ?? 0}
                $w={graph.layout?.w ?? columns}
                $collapseAt={collapseAt}
              >
                <DashboardPanel
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
        )
      })}
    </GraphGridSC>
  )
}

/**
 * A panel's identity, including what its data is fetched from. Panel data is
 * fetched once by identifier and isn't cached, so a panel whose query is edited
 * in place (e.g. by a job) remounts to fetch the new query's data.
 */
export function dashboardGraphDataKey(
  graph: Pick<DashboardPanelGraph, 'identifier' | 'type' | 'datasource'> & {
    toolId?: Nullable<string>
  }
) {
  const { type, tool, input } = graph.datasource ?? {}

  return JSON.stringify([
    graph.identifier,
    graph.type,
    graph.toolId ?? null,
    type ?? null,
    tool ?? null,
    input ?? null,
  ])
}

/** Row width below which its narrowest panel would be under MIN_PANEL_WIDTH_PX. */
export function rowCollapseWidth(
  columns: number,
  graphs: DashboardPanelGraph[]
) {
  const narrowest = Math.min(
    ...graphs.map((graph) => Math.max(1, graph.layout?.w ?? columns))
  )
  return Math.max(
    COLLAPSE_AT_PX,
    Math.ceil((MIN_PANEL_WIDTH_PX * columns) / Math.min(narrowest, columns))
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
  graph: DashboardPanelGraph
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
  graph,
  variables,
  timeRange,
  rangeRevision,
  queriesEnabled,
  onRangeSelect,
  onUpdate,
}: DashboardPanelProps) {
  const { useGraphData, readOnly } = useDashboardGraphSource()
  const needsFetch = dashboardGraphNeedsFetch(
    graph.type,
    graph.hasDatasource,
    queriesEnabled
  )
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useGraphData({
    identifier: graph.identifier,
    variables,
    timeRange,
    skip: !needsFetch,
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

  const query = readOnly ? null : datasourceQuery(graph.datasource?.input)
  const [queryOpen, setQueryOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const fullscreenTriggerRef = useRef<HTMLDivElement>(null)
  const { series, logs, traces } = useMemo(
    () => ({
      series: getMetricSeriesFromResponses(data?.series),
      logs: data?.logs?.filter(isNonNullable) ?? [],
      traces: data?.traces?.filter(isNonNullable) ?? [],
    }),
    [data]
  )
  const panelRangeSelect = useMemo(
    () =>
      onRangeSelect &&
      ((start: Date, end: Date) => {
        setFullscreen(false)
        onRangeSelect(start, end)
      }),
    [onRangeSelect]
  )
  const tool = graph.datasource?.tool
  const toolType = graph.workbenchTool?.tool ?? tool

  const panel = (
    <PanelCardSC $fullscreen={fullscreen}>
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <GraphHeader
          title={graph.title || graph.identifier}
          tooltip={fullscreen ? null : graph.description}
          actions={
            <>
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
              ) : null}
            </>
          }
        />
        {graph.description && fullscreen && (
          <CaptionP $color="text-xlight">{graph.description}</CaptionP>
        )}
      </Flex>
      <PanelBodySC aria-busy={loading}>
        {graph.staticContent ? (
          graph.staticContent
        ) : !graph.hasDatasource ? (
          <WorkbenchEmptyState
            variant="plain"
            inset={false}
            message="No data source"
            description="Connect a data source to this panel to see data."
          />
        ) : dashboardPanelIsWaitingForData({
            queriesEnabled,
            loading,
            hasData: !!data,
          }) ? (
          <DashboardPanelSkeleton fullscreen={fullscreen} />
        ) : error && !data ? (
          readOnly &&
          /not available on public dashboards/i.test(error.message) ? (
            <WorkbenchEmptyState
              variant="plain"
              inset={false}
              message="Not available on public dashboards"
              description="This panel's data can only be viewed while signed in."
            />
          ) : (
            <GqlError
              error={error}
              css={{ wordBreak: 'break-word' }}
            />
          )
        ) : (
          <PanelContent
            type={graph.type}
            unit={graph.unit}
            series={series}
            logs={logs}
            traces={traces}
            fullscreen={fullscreen}
            timeRange={timeRange}
            onRangeSelect={panelRangeSelect}
            selectedSeriesId={selectedSeriesId}
            onSelectSeries={(id) =>
              setSelectedSeriesId((selected) => (selected === id ? null : id))
            }
          />
        )}
      </PanelBodySC>
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
  series,
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
  series: MetricSeries[]
  logs: WorkbenchJobActivityLogFragment[]
  traces: WorkbenchJobActivityTraceFragment[]
  fullscreen: boolean
  timeRange: DashboardTimeRangeAttributes
  onRangeSelect?: (start: Date, end: Date) => void
  selectedSeriesId: string | null
  onSelectSeries: (id: string) => void
}) {
  const selectedSeriesIndex = series.findIndex(
    ({ id }) => id === selectedSeriesId
  )
  const effectiveSelectedId = selectedSeriesIndex >= 0 ? selectedSeriesId : null
  const visibleSeries = useMemo(
    () =>
      effectiveSelectedId
        ? series.filter(({ id }) => id === effectiveSelectedId)
        : series,
    [series, effectiveSelectedId]
  )
  const timeWindow = useMemo(
    () => ({ start: new Date(timeRange.start), end: new Date(timeRange.end) }),
    [timeRange.start, timeRange.end]
  )
  const lineProps = useMemo(
    () => ({
      colors:
        selectedSeriesIndex >= 0
          ? [COLORS[selectedSeriesIndex % COLORS.length]]
          : COLORS,
    }),
    [selectedSeriesIndex]
  )

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
          series={series}
          unit={unit}
        />
      )
    case DashboardGraphType.Pie:
      return <PieContent series={series} />
    case DashboardGraphType.Table:
      return (
        <TableContent
          series={series}
          unit={unit}
        />
      )
    case DashboardGraphType.Bar:
    case DashboardGraphType.Gauge:
    case DashboardGraphType.Heatmap:
    case DashboardGraphType.Timeseries:
    default:
      if (isEmpty(series)) return <NoDataState />
      return (
        <TimeseriesPanelContent
          series={series}
          fullscreen={fullscreen}
          selectedId={effectiveSelectedId}
          onSelectSeries={onSelectSeries}
        >
          <DashboardTimeseriesChart
            series={visibleSeries}
            timeWindow={timeWindow}
            unit={unit}
            onRangeSelect={onRangeSelect}
            css={{ height: '100%' }}
            lineProps={lineProps}
          />
        </TimeseriesPanelContent>
      )
  }
}

export type DashboardLegendMode = 'none' | 'row' | 'wrap' | 'side'

const HIDE_LEGEND_BELOW_PX = 360
const SIDE_LEGEND_FROM_PX = 900
// GraphLegend at 12px: swatch, gaps and padding around each label
const LEGEND_CHAR_PX = 7
const LEGEND_ITEM_CHROME_PX = 36
const LEGEND_ITEM_MAX_PX = 220

function legendRowWidth(labels: string[]) {
  return labels.reduce(
    (sum, label) =>
      sum +
      Math.min(
        label.length * LEGEND_CHAR_PX + LEGEND_ITEM_CHROME_PX,
        LEGEND_ITEM_MAX_PX
      ),
    0
  )
}

/**
 * Like Datadog's automatic legend: narrow panels rely on the hover tooltip,
 * a legend that fits on one line sits under the plot, and only one that
 * overflows it moves beside the plot on wide panels.
 */
export function dashboardLegendMode(
  width: number,
  fullscreen: boolean,
  labels: string[]
): DashboardLegendMode {
  // not measured yet
  if (width === 0) return 'row'
  if (!fullscreen && width < HIDE_LEGEND_BELOW_PX) return 'none'
  if (legendRowWidth(labels) <= width) return 'row'
  if (width >= SIDE_LEGEND_FROM_PX) return 'side'
  return fullscreen ? 'wrap' : 'row'
}

function TimeseriesPanelContent({
  series,
  fullscreen,
  selectedId,
  onSelectSeries,
  children,
}: {
  series: MetricSeries[]
  fullscreen: boolean
  selectedId: string | null
  onSelectSeries: (id: string) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useResizeObserver(ref, ({ width }) => setWidth(Math.floor(width)))
  const mode = dashboardLegendMode(
    width,
    fullscreen,
    series.map(({ shortLabel }) => shortLabel)
  )
  const legend = (layout: GraphLegendLayout, maxHeight?: number) => (
    <WorkbenchJobMetricsLegend
      series={series}
      layout={layout}
      maxHeight={maxHeight}
      selectedId={selectedId}
      onSelect={onSelectSeries}
    />
  )

  return (
    <TimeseriesSC
      ref={ref}
      $side={mode === 'side'}
    >
      <PlotAreaSC $fullscreen={fullscreen}>{children}</PlotAreaSC>
      {mode === 'side' && <SideLegendSC>{legend('column')}</SideLegendSC>}
      {mode === 'row' && legend('row')}
      {mode === 'wrap' && legend('wrap', 160)}
    </TimeseriesSC>
  )
}

function StatContent({
  series,
  unit,
}: {
  series: MetricSeries[]
  unit: Nullable<DashboardGraphUnit>
}) {
  if (isEmpty(series)) return <NoDataState />
  const latest = maxBy(
    series.flatMap((s) => s.data),
    ({ x }) => x.getTime()
  )

  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <StatValueSC>{latest ? formatStat(latest.y, unit) : '—'}</StatValueSC>
      <Body2P
        $color="text-light"
        title={series[0].label}
      >
        {series[0].shortLabel}
      </Body2P>
    </Flex>
  )
}

function PieContent({ series }: { series: MetricSeries[] }) {
  if (isEmpty(series)) return <NoDataState />
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
  series,
  unit,
}: {
  series: MetricSeries[]
  unit: Nullable<DashboardGraphUnit>
}) {
  if (isEmpty(series)) return <NoDataState />

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
  return (
    <WorkbenchEmptyState
      variant="plain"
      inset={false}
      message="No data"
      description="Nothing matched this filter and time range."
    />
  )
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

const RowSC = styled.div<{ $columns: number; $collapseAt: number }>(
  ({ theme, $columns, $collapseAt }) => ({
    alignItems: 'stretch',
    containerType: 'inline-size',
    display: 'grid',
    gap: theme.spacing.medium,
    gridTemplateColumns: `repeat(${$columns}, minmax(0, 1fr))`,
    width: '100%',
    [`@container (max-width: ${$collapseAt}px)`]: {
      gridTemplateColumns: '1fr',
    },
  })
)

const CellSC = styled.div<{ $x: number; $w: number; $collapseAt: number }>(
  ({ $x, $w, $collapseAt }) => ({
    display: 'flex',
    flexDirection: 'column',
    gridColumn: `${Math.max(1, $x + 1)} / span ${Math.max(1, $w)}`,
    minWidth: 0,
    [`@container (max-width: ${$collapseAt}px)`]: {
      gridColumn: '1 / -1',
    },
  })
)

const PanelCardSC = styled(MetricsCard)<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    flex: $fullscreen ? undefined : 1,
    gap: $fullscreen ? theme.spacing.medium : theme.spacing.small,
    height: $fullscreen ? '100%' : 'auto',
    minWidth: 0,
    overflow: $fullscreen ? 'auto' : undefined,
    padding: $fullscreen ? theme.spacing.large : theme.spacing.medium,
    width: '100%',
  })
)

const PanelBodySC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minWidth: 0,
  width: '100%',
})

const TimeseriesSC = styled.div<{ $side: boolean }>(({ theme, $side }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: $side ? 'row' : 'column',
  gap: $side ? theme.spacing.medium : theme.spacing.xsmall,
  minHeight: 0,
  width: '100%',
}))

// the chart is absolutely positioned so it fills whatever height the row gives
// the card without its own height feeding back into the row
const PlotAreaSC = styled.div<{ $fullscreen: boolean }>(({ $fullscreen }) => ({
  flex: 1,
  minHeight: $fullscreen ? 240 : CHART_HEIGHT_PX,
  minWidth: 0,
  position: 'relative',
  '&& > *': { inset: 0, position: 'absolute' },
}))

const SideLegendSC = styled.div({
  flex: '0 0 clamp(200px, 28%, 320px)',
  minWidth: 0,
  position: 'relative',
  '&& > *': { inset: 0, overflowY: 'auto', position: 'absolute' },
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
