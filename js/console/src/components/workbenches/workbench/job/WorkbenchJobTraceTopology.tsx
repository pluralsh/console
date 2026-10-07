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
import styled, { useTheme } from 'styled-components'
import { Body1BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { ErrorIcon, WarningIcon } from '@pluralsh/design-system'
import { formatDuration, formatSpanCount } from './workbenchJobTraceUtils'
import {
  getServiceNodesAndEdges,
  getServices,
  getSpanNodesAndEdges,
  type TraceGraphNodeData,
  type TraceGraphSpan,
} from './workbenchJobTraceGraph'
import { ReactFlowGraph } from 'components/utils/reactflow/ReactFlowGraph'

type TraceSpan = TraceGraphSpan

type TraceTopologyMode = 'services' | 'spans'

type TraceGraphNode = Node<TraceGraphNodeData, 'trace'>

const nodeTypes = { trace: TraceTopologyNode }

export function TraceTopology({
  mode,
  spans,
  fullscreen = false,
}: {
  fullscreen?: boolean
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
      <TraceSingleGraphSC $fullscreen={fullscreen}>
        <TraceNodeCard data={nodes[0].data} />
        <TraceGraphLegend services={services} />
      </TraceSingleGraphSC>
    )

  return (
    <TraceTopologySC $fullscreen={fullscreen}>
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
  const theme = useTheme()

  return (
    <ReactFlowGraph
      defaultEdgeOptions={{
        labelStyle: {
          ...theme.partials.text.caption,
          fill: theme.colors['text-light'],
        },
        labelBgStyle: { fill: theme.colors['fill-one'] },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 3,
      }}
      baseEdges={baseEdges}
      baseNodes={baseNodes}
      borderless
      elkOptions={traceElkOptions}
      nodeTypes={nodeTypes}
      showActions={false}
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      minZoom={0.1}
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
    <TraceNodeSC title={`${data.label} · ${nodeSubtitle(data)}`}>
      <TraceNodeAccentSC $color={data.color} />
      <TraceNodeBodySC>
        <TraceNodeTitleSC>
          <Body1BoldP
            css={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.label}
          </Body1BoldP>
          {data.tool && <CaptionP $color="text-xlight">tool</CaptionP>}
        </TraceNodeTitleSC>
        <Body2P
          $color="text-xlight"
          css={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nodeSubtitle(data)}
        </Body2P>
      </TraceNodeBodySC>
      <TraceNodeStatusIcon severity={data.severity} />
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

function nodeSubtitle(data: TraceGraphNodeData) {
  if (data.count)
    return `${formatSpanCount(data.count)} • ${formatDuration(data.duration / data.count)} avg`
  if (data.service !== data.label)
    return `${formatDuration(data.duration)} • ${data.service}`

  return formatDuration(data.duration)
}

const traceElkOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.spacing.nodeNodeBetweenLayers': '144',
  'elk.spacing.nodeNode': '32',
}

const TraceTopologySC = styled.div<{ $fullscreen: boolean }>(
  ({ $fullscreen }) => ({
    height: $fullscreen ? '100%' : 480,
    flex: $fullscreen ? 1 : undefined,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    '.react-flow': { background: 'transparent' },
  })
)

const TraceSingleGraphSC = styled(TraceTopologySC)(({ theme }) => ({
  alignItems: 'center',
  backgroundColor:
    theme.mode === 'dark' ? theme.colors.grey[950] : theme.colors['fill-zero'],
  backgroundImage: `radial-gradient(circle, ${theme.colors['border-fill-three']} 1px, transparent 1px)`,
  backgroundSize: `${theme.spacing.large}px ${theme.spacing.large}px`,
  display: 'flex',
  justifyContent: 'center',
}))

const TraceNodeSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  borderRadius: 3,
  display: 'flex',
  alignItems: 'center',
  minHeight: 70,
  minWidth: 200,
  overflow: 'hidden',
  position: 'relative',
  width: 260,
  paddingRight: 12,
  gap: 16,
}))

const TraceNodeAccentSC = styled.span<{ $color: string }>(({ $color }) => ({
  background: $color,
  alignSelf: 'stretch',
  flexShrink: 0,
  width: 3,
}))

const TraceNodeBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  minWidth: 0,
  padding: `${theme.spacing.small}px 0`,
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
  borderRadius: 2,
  flexShrink: 0,
  height: 10,
  width: 10,
}))

const TraceGraphLegendSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  bottom: theme.spacing.medium,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  left: theme.spacing.medium,
  maxWidth: 220,
  maxHeight: '45%',
  overflowY: 'auto',
  padding: theme.spacing.medium,
  position: 'absolute',
}))

const TraceGraphLegendItemSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))
