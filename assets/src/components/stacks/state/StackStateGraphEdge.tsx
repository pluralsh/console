import { ComponentProps } from 'react'
import { StepEdge } from 'reactflow'
import { useTheme } from 'styled-components'

export const STACK_STATE_GRAPH_EDGE_NAME = 'plural-stack-edge' as const

export function StackStateGraphEdge({
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
        stroke: theme.colors['border-selected'],
      }}
    />
  )
}
