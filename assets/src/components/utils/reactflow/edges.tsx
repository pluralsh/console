import { useTheme } from 'styled-components'
import { SmoothStepEdge, StepEdge } from 'reactflow'
import { ComponentProps } from 'react'

import { GateState } from '../../../generated/graphql'
import { useEdgeNodes } from '../../hooks/reactFlowHooks'

export const DIRECTED_EDGE_NAME = 'plural-basic-edge' as const
export const SMOOTH_EDGE_NAME = 'plural-smooth-edge' as const
export const PIPELINE_EDGE_NAME = 'plural-pipeline-edge' as const

const MARKER_ACTIVE_ID = 'plural-marker-arrow-active'
const MARKER_ID = 'plural-marker-arrow'

export const edgeTypes = {
  [SMOOTH_EDGE_NAME]: SmoothEdge,
  [DIRECTED_EDGE_NAME]: DirectedEdge,
  [PIPELINE_EDGE_NAME]: PipelineEdge,
} as const

function EdgeMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      markerWidth="24"
      markerHeight="24"
      viewBox="-10 -10 20 20"
      refX="0"
      refY="0"
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
    >
      <polyline
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        points="-5,-3 0,0 -5,3"
        style={{ stroke: color, strokeWidth: '1' }}
      />
    </marker>
  )
}

export function EdgeMarkerDefs() {
  const theme = useTheme()

  return (
    <svg>
      <defs>
        <EdgeMarker
          id={MARKER_ID}
          color={theme.colors.border}
        />
        <EdgeMarker
          id={MARKER_ACTIVE_ID}
          color={theme.colors['border-secondary']}
        />
      </defs>
    </svg>
  )
}

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
      markerEnd={`url(#${MARKER_ACTIVE_ID})`}
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
      markerEnd={`url(#${active ? MARKER_ACTIVE_ID : MARKER_ID})`}
    />
  )
}
