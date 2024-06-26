import { ComponentProps } from 'react'
import { SmoothStepEdge, StepEdge } from 'reactflow'
import { useTheme } from 'styled-components'

export const STACK_STATE_GRAPH_EDGE_NAME = 'plural-stack-edge' as const

export function StackStateGraphEdge({
  style,
  ...props
}: ComponentProps<typeof StepEdge>) {
  const theme = useTheme()

  return (
    <SmoothStepEdge
      data-something="data-something"
      {...props}
      pathOptions={{ borderRadius: theme.borderRadiuses.large }}
      style={{
        ...style,
        stroke: theme.colors['border-input'],
      }}
    />
  )
}
