import {
  Card,
  CaretDownIcon,
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
import { PieChart } from 'components/utils/PieChart'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { Body1P, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  DashboardGraphType,
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
  JobActivityMetricsChart,
  WorkbenchJobMetricsLegend,
} from '../job/WorkbenchJobActivityResults'
import { getMetricSeries, metricSeriesId } from '../job/workbenchJobMetrics'
import { TraceWaterfall } from '../job/WorkbenchJobTraces'
import { DashboardToolIcon, toolDisplayName } from './dashboardToolIcon'
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
  const [open, setOpen] = useState(() => !isDefaultCollapsed(section.options))

  return (
    <SectionSC>
      <SectionHeaderSC
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <SectionCaretSC $open={open} />
        <SectionTitleBlockSC>
          <Body1P>{section.title || section.identifier}</Body1P>
          {section.description && (
            <CaptionP $color="text-xlight">{section.description}</CaptionP>
          )}
        </SectionTitleBlockSC>
      </SectionHeaderSC>
      {open && (
        <SectionContentSC>
          {props.graphs.length > 0 ? (
            <DashboardGraphGrid {...props} />
          ) : (
            <EmptyState message="No panels in this section." />
          )}
        </SectionContentSC>
      )}
    </SectionSC>
  )
}

function DashboardGraphGrid({
  dashboardId,
  graphs,
  variables,
  timeRange,
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

function DashboardPanel({
  dashboardId,
  graph,
  variables,
  timeRange,
  onUpdate,
}: {
  dashboardId: string
  graph: DashboardGraph
  variables: Record<string, string>
  timeRange: DashboardTimeRangeAttributes
  onUpdate?: () => void
}) {
  const needsFetch =
    graph.type !== DashboardGraphType.Markdown && !!graph.datasource
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
  const data = currentData ?? previousData

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
        {graph.type === DashboardGraphType.Markdown ? (
          <ChatMarkdown text={graph.markdown || '_No content._'} />
        ) : !graph.datasource ? (
          <EmptyState message="This panel has no data source." />
        ) : loading ? (
          <DashboardPanelSkeleton fullscreen={fullscreen} />
        ) : error && !data ? (
          <GqlError
            error={error}
            css={{ wordBreak: 'break-word' }}
          />
        ) : (
          <PanelContent
            type={graph.type}
            metrics={metrics}
            logs={logs}
            traces={traces}
            fullscreen={fullscreen}
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
  metrics,
  logs,
  traces,
  fullscreen,
  selectedSeriesId,
  onSelectSeries,
}: {
  type: DashboardGraphType
  metrics: WorkbenchJobActivityMetricFragment[]
  logs: WorkbenchJobActivityLogFragment[]
  traces: WorkbenchJobActivityTraceFragment[]
  fullscreen: boolean
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
      return <StatContent metrics={metrics} />
    case DashboardGraphType.Pie:
      return <PieContent metrics={metrics} />
    case DashboardGraphType.Table:
      return <TableContent metrics={metrics} />
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
          <JobActivityMetricsChart
            metrics={visibleMetrics}
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
              yScale: { type: 'linear', min: 'auto', max: 'auto' },
            }}
          />
          <WorkbenchJobMetricsLegend
            compact
            series={series}
            paddingLeft={0}
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
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
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
        {latest?.value != null ? formatStat(latest.value) : '—'}
      </StatValueSC>
      {series[0] && <Body2P $color="text-light">{series[0].label}</Body2P>}
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
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
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
            <td>{s.label}</td>
            <td>{s.data.at(-1)?.y ?? '—'}</td>
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

function formatStat(value: number) {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1000) return value.toLocaleString()
  return String(Number(value.toPrecision(6)))
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

const SectionSC = styled.section(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  overflow: 'hidden',
  width: '100%',
}))

const SectionHeaderSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one'],
  color: theme.colors.text,
  cursor: 'pointer',
  display: 'flex',
  gap: theme.spacing.small,
  minHeight: 44,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  textAlign: 'left',
  width: '100%',
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.colors['border-outline-focused']}`,
    outlineOffset: -1,
  },
}))

const SectionCaretSC = styled(CaretDownIcon)<{ $open: boolean }>(
  ({ $open }) => ({
    flexShrink: 0,
    transform: $open ? 'rotate(0deg)' : 'rotate(-90deg)',
    transition: 'transform 150ms ease',
  })
)

const SectionTitleBlockSC = styled.div(({ theme }) => ({
  alignItems: 'baseline',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.small,
  minWidth: 0,
}))

const SectionContentSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
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
  fontFamily: theme.fontFamilies.mono,
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
