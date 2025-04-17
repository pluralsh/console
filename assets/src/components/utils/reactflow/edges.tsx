import {
  BezierEdge,
  type Edge,
  EdgeProps,
  SmoothStepEdge,
  StepEdge,
} from '@xyflow/react'
import { useTheme } from 'styled-components'

import { GateState } from '../../../generated/graphql'
import { useEdgeNodes } from '../../hooks/reactFlowHooks'

import { MarkerType } from './markers'

export enum EdgeType {
  Invisible = 'plural-invisible-edge',
  Bezier = 'plural-bezier-edge',
  Smooth = 'plural-smooth-edge',
  Directed = 'plural-directed-edge',
  BezierDirected = 'plural-bezier-directed-edge',
  Pipeline = 'plural-pipeline-edge',
}

export const edgeTypes = {
  [EdgeType.Invisible]: Invisible,
  [EdgeType.Bezier]: Bezier,
  [EdgeType.Smooth]: Smooth,
  [EdgeType.Directed]: Directed,
  [EdgeType.BezierDirected]: BezierDirected,
  [EdgeType.Pipeline]: Pipeline,
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
        stroke: theme.colors.border,
      }}
    />
  )
}

function BezierDirected({ style, ...props }: EdgeProps) {
  const theme = useTheme()

  return (
    <BezierEdge
      {...props}
      style={{
        ...style,
        stroke: theme.colors['border-input'],
      }}
      markerEnd={`url(#${MarkerType.ArrowStrong})`}
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

function Pipeline({ style, ...props }: EdgeProps) {
  const theme = useTheme()
  const { source } = useEdgeNodes({
    source: props.source,
    target: props.target,
  })
  const active = (source?.data as any)?.meta?.state === GateState.Open
  const color = active ? theme.colors['border-secondary'] : theme.colors.border

  return (
    <StepEdge
      {...props}
      style={{
        ...style,
        stroke: color,
      }}
      markerEnd={`url(#${active ? MarkerType.ArrowActive : MarkerType.Arrow})`}
    />
  )
}
