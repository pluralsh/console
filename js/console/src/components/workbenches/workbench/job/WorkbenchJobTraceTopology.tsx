import {
  ReactFlowProvider,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { LayoutOptions } from 'elkjs'
import { type ReactNode, useMemo } from 'react'
import styled from 'styled-components'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { ErrorIcon, WarningIcon } from '@pluralsh/design-system'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { traceBarColor } from './workbenchJobTraceColors'
import { isNonNullable } from 'utils/isNonNullable'
import { EdgeType } from 'components/utils/reactflow/edges'
import { ReactFlowGraph } from 'components/utils/reactflow/ReactFlowGraph'

type TraceSpan = Pick<
  WorkbenchJobActivityTraceFragment,
  'end' | 'name' | 'parentId' | 'service' | 'spanId' | 'start' | 'tags'
>

type TraceTopologyMode = 'services' | 'spans'

type TraceGraphNodeData = {
  color: string
  count?: number
  duration: number
  label: string
  service: string
  severity: 'danger' | 'success' | 'warning'
  tool?: boolean
}

type TraceGraphNode = Node<TraceGraphNodeData, 'trace'>

const nodeTypes = { trace: TraceTopologyNode }

export function TraceTopology({
  mode,
  spans,
}: {
  mode: TraceTopologyMode
  spans: TraceSpan[]
}) {
  const { nodes, edges } = useMemo(
    () =>
      mode === 'spans'
        ? getSpanNodesAndEdges(spans)
        : getServiceNodesAndEdges(spans),
    [mode, spans]
  )

  if (!nodes.length) return null

  const services = getServices(spans)

  if (nodes.length === 1 && !edges.length)
    return (
      <TraceSingleGraphSC>
        <TraceNodeCard data={nodes[0].data} />
        <TraceGraphLegend services={services} />
      </TraceSingleGraphSC>
    )

  return (
    <TraceTopologySC $count={nodes.length}>
      <ReactFlowProvider>
        <TraceTopologyGraph
          baseEdges={edges}
          baseNodes={nodes}
          services={services}
        />
      </ReactFlowProvider>
    </TraceTopologySC>
  )
}

function TraceTopologyGraph({
  baseEdges,
  baseNodes,
  services,
}: {
  baseEdges: Edge[]
  baseNodes: TraceGraphNode[]
  services: { color: string; name: string }[]
}) {
  return (
    <ReactFlowGraph
      baseEdges={baseEdges}
      baseNodes={baseNodes}
      borderless
      elkOptions={traceElkOptions}
      nodeTypes={nodeTypes}
      showActions={false}
      showLayoutingIndicator={false}
      additionalOverlays={<TraceGraphLegend services={services} />}
    />
  )
}

function TraceTopologyNode({ data }: NodeProps<TraceGraphNode>) {
  return (
    <TraceNodeCard data={data}>
      <TraceNodeHandleSC
        type="target"
        position={Position.Left}
      />
      <TraceNodeHandleSC
        type="source"
        position={Position.Right}
      />
    </TraceNodeCard>
  )
}

function TraceNodeCard({
  children,
  data,
}: {
  children?: ReactNode
  data: TraceGraphNodeData
}) {
  return (
    <TraceNodeSC>
      <TraceNodeAccentSC $color={data.color} />
      <TraceNodeBodySC>
        <TraceNodeTitleSC>
          <Body2BoldP css={{ minWidth: 0 }}>{data.label}</Body2BoldP>
          {data.tool && <CaptionP $color="text-xlight">tool</CaptionP>}
          <TraceNodeStatusIcon severity={data.severity} />
        </TraceNodeTitleSC>
        <CaptionP $color="text-xlight">{nodeSubtitle(data)}</CaptionP>
      </TraceNodeBodySC>
      {children}
    </TraceNodeSC>
  )
}

function TraceGraphLegend({
  services,
}: {
  services: { color: string; name: string }[]
}) {
  return (
    <TraceGraphLegendSC>
      <CaptionP $color="text-xlight">Services</CaptionP>
      {services.map((service) => (
        <TraceGraphLegendItemSC key={service.name}>
          <ServiceDotSC $color={service.color} />
          <CaptionP>{service.name}</CaptionP>
        </TraceGraphLegendItemSC>
      ))}
    </TraceGraphLegendSC>
  )
}

function TraceNodeStatusIcon({
  severity,
}: {
  severity: TraceGraphNodeData['severity']
}) {
  if (severity === 'danger')
    return (
      <ErrorIcon
        color="icon-danger"
        size={16}
      />
    )
  if (severity === 'warning')
    return (
      <WarningIcon
        color="icon-warning"
        size={16}
      />
    )

  return null
}

export function getSpanNodesAndEdges(spans: TraceSpan[]) {
  const validSpans = spans.map(toSpanData).filter(isNonNullable)
  const spanIdToNodeId = new Map<string, string>()
  const nodes = validSpans.map(({ duration, index, span }) => {
    const id = `span:${span.spanId ?? index}`
    if (span.spanId) spanIdToNodeId.set(span.spanId, id)

    return {
      data: {
        color: serviceColor(serviceName(span)),
        duration,
        label: span.name ?? 'Unnamed span',
        service: serviceName(span),
        severity: nodeSeverity(span.tags),
        tool: isToolSpan(span.tags),
      },
      id,
      position: { x: 0, y: 0 },
      type: 'trace' as const,
    }
  })
  const edges = validSpans.flatMap(({ index, span }) => {
    const source = span.parentId ? spanIdToNodeId.get(span.parentId) : undefined
    const target = `span:${span.spanId ?? index}`
    if (!source || source === target) return []

    return [traceEdge(source, target)]
  })

  return { edges, nodes }
}

export function getServiceNodesAndEdges(spans: TraceSpan[]) {
  const validSpans = spans.map(toSpanData).filter(isNonNullable)
  const spanById = new Map(
    validSpans
      .filter(({ span }) => !!span.spanId)
      .map(({ span }) => [span.spanId!, span])
  )
  const services = new Map<
    string,
    {
      duration: number
      severity: TraceGraphNodeData['severity']
      spans: TraceSpan[]
    }
  >()

  validSpans.forEach(({ duration, span }) => {
    const service = serviceName(span)
    const current = services.get(service) ?? {
      duration: 0,
      severity: 'success' as const,
      spans: [],
    }
    services.set(service, {
      duration: current.duration + duration,
      severity: worseSeverity(current.severity, nodeSeverity(span.tags)),
      spans: [...current.spans, span],
    })
  })

  const nodes = [...services.entries()].map(([service, value]) => ({
    data: {
      color: serviceColor(service),
      count: value.spans.length,
      duration: value.duration,
      label: service,
      service,
      severity: value.severity,
    },
    id: `service:${service}`,
    position: { x: 0, y: 0 },
    type: 'trace' as const,
  }))
  const edgeIds = new Set<string>()
  const edges = validSpans.flatMap(({ span }) => {
    const parent = span.parentId ? spanById.get(span.parentId) : undefined
    if (!parent) return []

    const source = `service:${serviceName(parent)}`
    const target = `service:${serviceName(span)}`
    const id = `${source}->${target}`
    if (source === target || edgeIds.has(id)) return []
    edgeIds.add(id)

    return [traceEdge(source, target)]
  })

  return { edges, nodes }
}

function toSpanData(span: TraceSpan, index: number) {
  const start = timestamp(span.start)
  const end = timestamp(span.end)
  if (start == null || end == null) return null

  return { duration: Math.max(0, end - start), index, span }
}

function traceEdge(source: string, target: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: EdgeType.Directed,
  }
}

function getServices(spans: TraceSpan[]) {
  return [...new Set(spans.map(serviceName))].map((name) => ({
    color: serviceColor(name),
    name,
  }))
}

function serviceName(span: TraceSpan) {
  return span.service ?? 'Unknown service'
}

function timestamp(value: Nullable<string>) {
  if (!value) return null
  const result = new Date(value).getTime()
  return Number.isNaN(result) ? null : result
}

function formatDuration(duration: number) {
  const ms = Math.round(Math.max(0, duration))

  if (ms < 1_000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(2)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function formatSpanCount(count: number) {
  return `${count} ${count === 1 ? 'span' : 'spans'}`
}

function nodeSubtitle(data: TraceGraphNodeData) {
  if (data.count)
    return `${formatDuration(data.duration)} • ${formatSpanCount(data.count)}`
  if (data.service !== data.label)
    return `${formatDuration(data.duration)} • ${data.service}`

  return formatDuration(data.duration)
}

function nodeSeverity(
  tags: Nullable<Record<string, unknown>>
): TraceGraphNodeData['severity'] {
  if (!tags) return 'success'

  const status = String(
    tags['otel.status_code'] ?? tags['status.code'] ?? tags.status ?? ''
  ).toLowerCase()
  const httpStatus = Number(
    tags['http.response.status_code'] ?? tags['http.status_code']
  )

  if (
    tags.error ||
    tags['error.type'] ||
    status === 'error' ||
    httpStatus >= 500
  )
    return 'danger'
  if (status === 'warning' || status === 'warn') return 'warning'

  return 'success'
}

function worseSeverity(
  current: TraceGraphNodeData['severity'],
  next: TraceGraphNodeData['severity']
) {
  if (current === 'danger' || next === 'danger') return 'danger'
  if (current === 'warning' || next === 'warning') return 'warning'

  return 'success'
}

function isToolSpan(tags: Nullable<Record<string, unknown>>) {
  return !!tags && Object.keys(tags).some((key) => /tool/i.test(key))
}

function serviceColor(service: string) {
  return traceBarColor(service).accent
}

const traceElkOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.spacing.nodeNodeBetweenLayers': '72',
  'elk.spacing.nodeNode': '32',
}

const TraceTopologySC = styled.div<{ $count: number }>(({ $count }) => ({
  height: Math.min(520, Math.max(280, 168 + $count * 88)),
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
}))

const TraceSingleGraphSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  backgroundColor:
    theme.mode === 'dark' ? theme.colors.grey[950] : theme.colors['fill-zero'],
  backgroundImage: `radial-gradient(circle, ${theme.colors['border-fill-three']} 1px, transparent 1px)`,
  backgroundSize: `${theme.spacing.large}px ${theme.spacing.large}px`,
  display: 'flex',
  height: 280,
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
}))

const TraceNodeSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors['border-fill-two']}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  minWidth: 160,
  overflow: 'hidden',
  position: 'relative',
  width: 220,
}))

const TraceNodeAccentSC = styled.span<{ $color: string }>(({ $color }) => ({
  background: $color,
  flexShrink: 0,
  width: 3,
}))

const TraceNodeBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
}))

const TraceNodeTitleSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const TraceNodeHandleSC = styled(Handle)({
  opacity: 0,
})

const ServiceDotSC = styled.span<{ $color: string }>(({ $color }) => ({
  background: $color,
  borderRadius: '50%',
  flexShrink: 0,
  height: 8,
  width: 8,
}))

const TraceGraphLegendSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  bottom: theme.spacing.small,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  left: theme.spacing.small,
  maxWidth: 180,
  padding: theme.spacing.small,
  position: 'absolute',
}))

const TraceGraphLegendItemSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))
