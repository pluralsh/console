import {
  Card,
  DocsIcon,
  EmptyState,
  Flex,
  IconFrame,
  InfoIcon,
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
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityLogs,
  JobActivityMetricsChart,
  WorkbenchJobMetricsLegend,
} from '../job/WorkbenchJobActivityResults'
import { getMetricSeries } from '../job/workbenchJobMetrics'
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

export function WorkbenchDashboardPanels({
  dashboardId,
  graphs,
  variables,
  timeRange,
  onUpdate,
}: {
  dashboardId: string
  graphs: DashboardGraph[]
  variables: Record<string, string | string[]>
  timeRange: DashboardTimeRangeAttributes
  onUpdate?: () => void
}) {
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

  if (graphs.length === 0) {
    return (
      <Card css={{ padding: 24 }}>
        <EmptyState message="No panels yet." />
      </Card>
    )
  }

  return (
    <StackSC>
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
    </StackSC>
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
  variables: Record<string, string | string[]>
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
  const result = data?.workbenchDashboard?.graph
  const metrics = result?.metrics?.filter(isNonNullable) ?? []
  const logs = result?.logs?.filter(isNonNullable) ?? []
  const traces = result?.traces?.filter(isNonNullable) ?? []
  const tool = graph.datasource?.tool

  return (
    <PanelCardSC>
      <PanelHeaderSC>
        <Flex
          direction="column"
          gap="xxsmall"
          minWidth={0}
          flex={1}
        >
          <PanelTitleSC>{graph.title || graph.identifier}</PanelTitleSC>
          {tool && (
            <Flex
              align="center"
              gap="xxsmall"
            >
              <DashboardToolIcon
                tool={tool}
                size={10}
              />
              <CaptionP $color="text-xlight">{toolDisplayName(tool)}</CaptionP>
            </Flex>
          )}
        </Flex>
        {query ? (
          <IconFrame
            clickable
            size="small"
            type="tertiary"
            icon={<DocsIcon />}
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
      </PanelHeaderSC>
      <PanelBodySC>
        {graph.type === DashboardGraphType.Markdown ? (
          <ChatMarkdown text={graph.markdown || '_No content._'} />
        ) : !graph.datasource ? (
          <EmptyState message="This panel has no data source." />
        ) : error && !data ? (
          <GqlError
            error={error}
            css={{ wordBreak: 'break-word' }}
          />
        ) : loading && !data ? (
          <RectangleSkeleton
            $height={CHART_HEIGHT_PX}
            $width="100%"
          />
        ) : (
          <PanelContent
            type={graph.type}
            metrics={metrics}
            logs={logs}
            traces={traces}
          />
        )}
      </PanelBodySC>
      {graph.description && (
        <CaptionP $color="text-xlight">{graph.description}</CaptionP>
      )}
      {query && (
        <QueryDefinitionModal
          open={queryOpen}
          onClose={() => setQueryOpen(false)}
          title={graph.title || graph.identifier}
          query={query}
          onUpdate={onUpdate}
        />
      )}
    </PanelCardSC>
  )
}

function PanelContent({
  type,
  metrics,
  logs,
  traces,
}: {
  type: DashboardGraphType
  metrics: WorkbenchJobActivityMetricFragment[]
  logs: WorkbenchJobActivityLogFragment[]
  traces: WorkbenchJobActivityTraceFragment[]
}) {
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
          <WorkbenchJobMetricsLegend
            series={getMetricSeries(metrics)}
            paddingLeft={0}
            maxHeight={88}
          />
          <JobActivityMetricsChart
            metrics={metrics}
            css={{ height: CHART_HEIGHT_PX }}
            lineProps={{
              yScale: { type: 'linear', min: 'auto', max: 'auto' },
            }}
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

const PanelCardSC = styled(Card)(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: 'auto',
  minWidth: 0,
  padding: theme.spacing.large,
  width: '100%',
}))

const PanelHeaderSC = styled.div({
  alignItems: 'flex-start',
  display: 'flex',
  gap: 16,
  width: '100%',
})

const PanelTitleSC = styled(Body1P)({
  ...TRUNCATE,
  margin: 0,
})

const PanelBodySC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  width: '100%',
})

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
