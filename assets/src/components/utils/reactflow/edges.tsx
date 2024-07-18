import { useTheme } from 'styled-components'
import { SmoothStepEdge, StepEdge } from 'reactflow'
import { ComponentProps } from 'react'

import { GateState } from '../../../generated/graphql'
import { useEdgeNodes } from '../../hooks/reactFlowHooks'

import { MarkerType } from './markers'

export enum EdgeType {
  Smooth = 'plural-smooth-edge',
  Directed = 'plural-directed-edge',
  Pipeline = 'plural-pipeline-edge',
}

export const edgeTypes = {
  [EdgeType.Smooth]: SmoothEdge,
  [EdgeType.Directed]: DirectedEdge,
  [EdgeType.Pipeline]: PipelineEdge,
} as const

function SmoothEdge({ style, ...props }: ComponentProps<typeof StepEdge>) {
  const theme = useTheme()

  return (
    <SmoothStepEdge
      data-something="data-something"
      {...props}
      pathOptions={{ borderRadius: theme.borderRadiuses.medium }}
      style={{
        ...style,
        stroke: theme.colors.border,
      }}
    />
  )
}

function DirectedEdge({ style, ...props }: ComponentProps<typeof StepEdge>) {
  const theme = useTheme()

  return (
    <StepEdge
      data-something="data-something"
      {...props}
      style={{
        ...style,
        stroke: theme.colors['border-secondary'],
      }}
      markerEnd={`url(#${MarkerType.ArrowActive})`}
    />
  )
}

function PipelineEdge({ style, ...props }: ComponentProps<typeof StepEdge>) {
  const theme = useTheme()
  const { source } = useEdgeNodes({
    source: props.source,
    target: props.target,
  })
  const active = (source?.data as any)?.meta?.state === GateState.Open
  const color = active ? theme.colors['border-secondary'] : theme.colors.border

  return (
    <StepEdge
      data-something="data-something"
      {...props}
      style={{
        ...style,
        stroke: color,
      }}
      markerEnd={`url(#${active ? MarkerType.ArrowActive : MarkerType.Arrow})`}
    />
  )
}
