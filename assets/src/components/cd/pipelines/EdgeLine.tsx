import { GateState } from 'generated/graphql'
import { ComponentProps } from 'react'
import { StepEdge } from 'reactflow'
import { useTheme } from 'styled-components'

import { useEdgeNodes } from './utils/hooks'

export const CUSTOM_EDGE_NAME = 'plural-edge' as const
const MARKER_ACTIVE_ID = 'pipeline-markerArrowActive'
const MARKER_ID = 'pipeline-markerArrow'

export default function EdgeLine({
  style,
  ...props
}: ComponentProps<typeof StepEdge>) {
  const theme = useTheme()
  const { source } = useEdgeNodes({
    source: props.source,
    target: props.target,
  })
  const active = (source?.data as any)?.meta.state === GateState.Open
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

export const edgeTypes = { [CUSTOM_EDGE_NAME]: EdgeLine } as const
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
