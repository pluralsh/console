import {
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { LayoutOptions } from 'elkjs'
import { useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { COLORS } from 'utils/color'
import { isNonNullable } from 'utils/isNonNullable'
import { EdgeType } from 'components/utils/reactflow/edges'
import { ReactFlowGraph } from 'components/utils/reactflow/ReactFlowGraph'
import { NodeBase } from 'components/utils/reactflow/nodes'

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
  tags?: Nullable<Record<string, unknown>>
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

  return (
    <TraceTopologySC>
      <ReactFlowProvider>
        <TraceTopologyGraph
          baseEdges={edges}
          baseNodes={nodes}
          services={getServices(spans)}
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
  const [selectedNode, setSelectedNode] = useState<TraceGraphNode>()

  return (
    <ReactFlowGraph
      allowFullscreen
      baseEdges={baseEdges}
      baseNodes={baseNodes}
      elkOptions={traceElkOptions}
      nodeTypes={nodeTypes}
      showLayoutingIndicator={false}
      onNodeClick={(_, node) => setSelectedNode(node as TraceGraphNode)}
      additionalOverlays={
        <>
          <TraceGraphLegendSC>
            <CaptionP $color="text-xlight">Services</CaptionP>
            {services.map((service) => (
              <TraceGraphLegendItemSC key={service.name}>
                <ServiceDotSC $color={service.color} />
                <CaptionP>{service.name}</CaptionP>
              </TraceGraphLegendItemSC>
            ))}
          </TraceGraphLegendSC>
          {selectedNode && (
            <TraceGraphDetailSC>
              <Body2BoldP>{selectedNode.data.label}</Body2BoldP>
              <CaptionP $color="text-xlight">
                {selectedNode.data.service} ·{' '}
                {formatDuration(selectedNode.data.duration)}
                {selectedNode.data.count
                  ? ` · ${selectedNode.data.count} spans`
                  : ''}
              </CaptionP>
            </TraceGraphDetailSC>
          )}
        </>
      }
    />
  )
}

function TraceTopologyNode({ data, id }: NodeProps<TraceGraphNode>) {
  const theme = useTheme()

  return (
    <NodeBase
      id={id}
      css={{
        gap: theme.spacing.xxsmall,
        minWidth: 160,
        padding: theme.spacing.small,
        width: 220,
      }}
    >
      <TraceNodeHeaderSC>
        <ServiceDotSC $color={data.color} />
        <Body2BoldP>{data.label}</Body2BoldP>
      </TraceNodeHeaderSC>
      <CaptionP $color="text-xlight">
        {data.service} · {formatDuration(data.duration)}
        {data.count ? ` · ${data.count} spans` : ''}
      </CaptionP>
    </NodeBase>
  )
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
        tags: span.tags,
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
  const services = new Map<string, { duration: number; spans: TraceSpan[] }>()

  validSpans.forEach(({ duration, span }) => {
    const service = serviceName(span)
    const current = services.get(service) ?? { duration: 0, spans: [] }
    services.set(service, {
      duration: current.duration + duration,
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
  if (duration < 1_000) return `${Math.round(duration)}ms`
  if (duration < 60_000) return `${(duration / 1_000).toFixed(2)}s`
  return `${(duration / 60_000).toFixed(1)}m`
}

function serviceColor(service: string) {
  const hash = [...service].reduce(
    (value, char) => value + char.charCodeAt(0),
    0
  )
  return COLORS[hash % COLORS.length]
}

const traceElkOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.spacing.nodeNodeBetweenLayers': '72',
  'elk.spacing.nodeNode': '32',
}

const TraceTopologySC = styled.div(({ theme }) => ({
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  height: 360,
  overflow: 'hidden',
  width: '100%',
}))

const TraceNodeHeaderSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

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
  bottom: theme.spacing.xsmall,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  left: theme.spacing.xsmall,
  maxWidth: 180,
  padding: theme.spacing.xsmall,
  position: 'absolute',
}))

const TraceGraphLegendItemSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
}))

const TraceGraphDetailSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  bottom: theme.spacing.xsmall,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  maxWidth: 260,
  padding: theme.spacing.xsmall,
  position: 'absolute',
  right: theme.spacing.xsmall,
}))
