import { useTheme } from 'styled-components'
import { SmoothStepEdge, StepEdge } from 'reactflow'
import { ComponentProps } from 'react'

import { useEdgeNodes } from '../hooks/reactFlowHooks'
import { GateState } from '../../generated/graphql'

export const MARKED_STEP_EDGE_NAME = 'plural-marked-step-edge' as const
export const STEP_EDGE_NAME = 'plural-step-edge' as const
export const SMOOTH_STEP_EDGE_NAME = 'plural-smooth-step-edge' as const
const MARKER_ACTIVE_ID = 'plural-marker-arrow-active'
const MARKER_ID = 'plural-marker-arrow'

export const edgeTypes = {
  [MARKED_STEP_EDGE_NAME]: ReactFlowMarkedStepEdge,
  [STEP_EDGE_NAME]: ReactFlowStepEdge,
  [SMOOTH_STEP_EDGE_NAME]: ReactFlowSmoothStepEdge,
} as const

function EdgeLineMarker({ id, color }: { id: string; color: string }) {
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

export function EdgeLineMarkerDefs() {
  const theme = useTheme()

  return (
    <svg>
      <defs>
        <EdgeLineMarker
          id={MARKER_ID}
          color={theme.colors.border}
        />
        <EdgeLineMarker
          id={MARKER_ACTIVE_ID}
          color={theme.colors['border-secondary']}
        />
      </defs>
    </svg>
  )
}

export function ReactFlowStepEdge({
  style,
  ...props
}: ComponentProps<typeof StepEdge>) {
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

export default function ReactFlowMarkedStepEdge({
  style,
  ...props
}: ComponentProps<typeof StepEdge>) {
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

export function ReactFlowSmoothStepEdge({
  style,
  ...props
}: ComponentProps<typeof StepEdge>) {
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
