import { PieChart } from 'components/utils/PieChart'
import {
  DashboardGraphType,
  WorkbenchCanvasBlockFragment,
  WorkbenchCanvasBlockGraph,
  WorkbenchCanvasBlockType,
  WorkbenchCanvasToolGraph,
} from 'generated/graphql'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
import { isNonNullable } from 'utils/isNonNullable'
import { DashboardPanelGraph } from '../monitoring/DashboardGraphSource'
import type { JobCanvasQuery, JobCanvasQueryType } from './JobCanvasGraphSource'
import { hasWorkbenchMetricsToolQuery } from './WorkbenchJobActivityResults'
import { getToolGraphSummaries } from './workbenchJobCanvasSummaries'

export const CANVAS_COLUMNS = 3
/** Nivo `ResponsivePie` needs a sized parent. */
const PIE_CHART_HEIGHT_PX = 200

const TOOL_PANEL_TYPES: Record<JobCanvasQueryType, DashboardGraphType> = {
  metrics: DashboardGraphType.Timeseries,
  logs: DashboardGraphType.Logs,
  traces: DashboardGraphType.Traces,
}

/**
 * Maps canvas blocks onto workbench dashboard panels, plus the tool queries
 * that back their data, keyed by panel identifier.
 */
export function canvasPanels(blocks: WorkbenchCanvasBlockFragment[]) {
  const graphs: DashboardPanelGraph[] = []
  const queries: Record<string, JobCanvasQuery> = {}

  blocks.forEach((block, i) => {
    const identifier = block.identifier || `block-${i}`
    const base = {
      identifier,
      sectionId: block.sectionId,
      description: block.description,
      title: block.title,
      layout: {
        x: block.layout?.x ?? 0,
        y: block.layout?.y ?? 0,
        w: block.layout?.w ?? CANVAS_COLUMNS,
        h: block.layout?.h ?? 1,
      },
      hasDatasource: false,
    }
    const content = block.content
    const addToolPanel = (
      type: JobCanvasQueryType,
      graph: Nullable<WorkbenchCanvasToolGraph>
    ) => {
      const query = graph?.query
      const hasDatasource = hasWorkbenchMetricsToolQuery(query)
      if (query && hasDatasource) queries[identifier] = { type, query }
      graphs.push({
        ...base,
        type: TOOL_PANEL_TYPES[type],
        title: graph?.title || block.title,
        description: block.description || toolGraphDescription(graph),
        hasDatasource,
      })
    }

    switch (block.type) {
      case WorkbenchCanvasBlockType.Metrics:
        addToolPanel('metrics', content?.metrics)
        break
      case WorkbenchCanvasBlockType.Logs:
        addToolPanel('logs', content?.logs)
        break
      case WorkbenchCanvasBlockType.Traces:
        addToolPanel('traces', content?.traces)
        break
      case WorkbenchCanvasBlockType.Section:
        graphs.push({
          ...base,
          type: DashboardGraphType.Section,
          options: block.collapsed ? { collapsed: true } : null,
        })
        break
      case WorkbenchCanvasBlockType.Markdown:
        graphs.push({
          ...base,
          type: DashboardGraphType.Markdown,
          markdown: content?.markdown,
        })
        break
      case WorkbenchCanvasBlockType.Pie:
        graphs.push({
          ...base,
          type: DashboardGraphType.Pie,
          title: content?.pie?.title || block.title,
          staticContent: <CanvasPie graph={content?.pie} />,
        })
        break
      case WorkbenchCanvasBlockType.Bar:
        graphs.push({
          ...base,
          type: DashboardGraphType.Bar,
          title: content?.bar?.title || block.title,
          staticContent: <CanvasBar graph={content?.bar} />,
        })
        break
      case null:
      case undefined:
        break
    }
  })

  return { graphs, queries }
}

function toolGraphDescription(graph: Nullable<WorkbenchCanvasToolGraph>) {
  const { graphSummary, querySummary, hasDistinctQuerySummary } =
    getToolGraphSummaries(graph)
  const parts = [graphSummary, hasDistinctQuerySummary ? querySummary : null]
  return parts.filter(Boolean).join(' ') || null
}

function CanvasPie({ graph }: { graph: Nullable<WorkbenchCanvasBlockGraph> }) {
  const data = (graph?.data ?? []).filter(isNonNullable).map((p, i) => ({
    id: p.label ?? `slice-${i}`,
    label: p.label ?? '',
    value: p.value ?? 0,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div css={{ minWidth: 0, width: '100%' }}>
      <PieChart
        data={data}
        height={PIE_CHART_HEIGHT_PX}
        width="100%"
      />
    </div>
  )
}

function CanvasBar({ graph }: { graph: Nullable<WorkbenchCanvasBlockGraph> }) {
  const points = (graph?.data ?? []).filter(isNonNullable)
  const max = Math.max(...points.map((p) => p.value ?? 0), 1)

  return (
    <BarListSC>
      {points.map((p, i) => (
        <BarRowSC key={`${p.label ?? ''}-${i}`}>
          <BarLabelSC title={p.label ?? ''}>{p.label ?? ''}</BarLabelSC>
          <BarTrackSC>
            <BarFillSC
              $pct={((p.value ?? 0) / max) * 100}
              $color={COLORS[i % COLORS.length]}
            />
          </BarTrackSC>
          <BarValueSC>{p.value ?? 0}</BarValueSC>
        </BarRowSC>
      ))}
    </BarListSC>
  )
}

const BarListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const BarRowSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'grid',
  gap: theme.spacing.small,
  gridTemplateColumns: 'minmax(60px, 120px) 1fr auto',
}))

const BarLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const BarTrackSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-two'],
  borderRadius: 4,
  height: 8,
  overflow: 'hidden',
}))

const BarFillSC = styled.div<{ $pct: number; $color: string }>(
  ({ $pct, $color }) => ({
    background: $color,
    borderRadius: 4,
    height: '100%',
    transition: 'width 200ms ease-out',
    width: `${Math.max(0, Math.min(100, $pct))}%`,
  })
)

const BarValueSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
}))
