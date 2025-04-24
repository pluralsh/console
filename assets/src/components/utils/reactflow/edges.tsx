import {
  BaseEdge,
  BezierEdge,
  type Edge,
  EdgeProps as FlowEdgeProps,
  SmoothStepEdge,
  StepEdge,
} from '@xyflow/react'
import { useTheme } from 'styled-components'

import { GateState } from '../../../generated/graphql'
import { useEdgeNodes } from '../../hooks/reactFlowHooks'

import { ElkEdgeSection, ElkLabel } from 'elkjs'
import { MarkerType } from './markers'

export type EdgeProps<T extends Edge = Edge> = FlowEdgeProps<T> & {
  data?: {
    elkPathData: Nullable<ElkEdgeSection[]>
    elkLabels?: Nullable<ElkLabel[]>
  }
}

export enum EdgeType {
  Invisible = 'plural-invisible-edge',
  Bezier = 'plural-bezier-edge',
  Smooth = 'plural-smooth-edge',
  Directed = 'plural-directed-edge',
  Pipeline = 'plural-pipeline-edge',
  Network = 'plural-network-edge',
}

export const edgeTypes = {
  [EdgeType.Invisible]: Invisible,
  [EdgeType.Bezier]: Bezier,
  [EdgeType.Smooth]: Smooth,
  [EdgeType.Directed]: Directed,
  [EdgeType.Pipeline]: Pipeline,
  [EdgeType.Network]: Network,
} as const

export function isVisible(edge: Edge): boolean {
  return edge.type !== EdgeType.Invisible
}

function Invisible({ ...props }: EdgeProps) {
  return (
    <BezierEdge
      {...props}
      style={{ display: 'none' }}
    />
  )
}

function Bezier({ style, ...props }: EdgeProps) {
  const theme = useTheme()

  return (
    <BezierEdge
      {...props}
      style={{
        ...style,
        stroke: theme.colors.border,
      }}
    />
  )
}

function Smooth({ style, ...props }: EdgeProps) {
  const theme = useTheme()

  return (
    <SmoothStepEdge
      {...props}
      pathOptions={{ borderRadius: theme.borderRadiuses.medium }}
      style={{
        ...style,
        stroke: theme.colors['border-input'],
      }}
    />
  )
}

function Directed({ style, ...props }: EdgeProps) {
  const theme = useTheme()

  return (
    <StepEdge
      {...props}
      style={{
        ...style,
        stroke: theme.colors['border-secondary'],
      }}
      markerEnd={`url(#${MarkerType.ArrowActive})`}
    />
  )
}

function Pipeline({ style, data, ...props }: EdgeProps) {
  const theme = useTheme()
  const { source } = useEdgeNodes({
    source: props.source,
    target: props.target,
  })
  const active = (source?.data as any)?.meta?.state === GateState.Open
  const color = active ? theme.colors['border-secondary'] : theme.colors.border

  const path = generateElkEdgePath(data?.elkPathData)

  return (
    <BaseEdge
      path={path}
      style={{
        ...style,
        stroke: color,
      }}
      markerEnd={`url(#${active ? MarkerType.ArrowActive : MarkerType.Arrow})`}
    />
  )
}

function Network({ style, selected, data }: EdgeProps) {
  const { colors } = useTheme()
  const path = generateElkEdgePath(data?.elkPathData)

  let color: string = colors.border
  let markerType = MarkerType.Arrow
  if (selected) {
    markerType = MarkerType.ArrowPrimary
    color = colors['border-primary']
  } else if (style?.stroke === colors['text-light']) {
    markerType = MarkerType.ArrowHovered
    color = colors['text-light']
  }

  return (
    <BaseEdge
      path={path}
      style={{
        ...style,
        strokeWidth: selected ? 1 : style?.strokeWidth || 1,
        stroke: color,
        transition: 'stroke 0.1s ease-out, stroke-width 0.1s ease-out',
      }}
      markerEnd={`url(#${markerType})`}
    />
  )
}

export const generateElkEdgePath = (sections: Nullable<ElkEdgeSection[]>) => {
  if (!sections || sections.length === 0) return ''

  let d = ''
  sections.forEach(({ startPoint, endPoint, bendPoints }) => {
    d += `M ${startPoint.x} ${startPoint.y}`
    bendPoints?.forEach((bend) => (d += ` L ${bend.x} ${bend.y}`))
    d += ` L ${endPoint.x} ${endPoint.y}`
  })

  return d
}
