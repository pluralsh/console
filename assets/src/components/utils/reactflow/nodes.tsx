import { Card } from '@pluralsh/design-system'
import { ComponentProps, ReactNode, use } from 'react'
import { Handle, NodeProps, Position } from '@xyflow/react'
import styled, { useTheme } from 'styled-components'

import isEmpty from 'lodash/isEmpty'

import { useNodeEdges } from '../../hooks/reactFlowHooks'

import { isVisible } from './edges'
import { GraphLayoutCtx } from './graph'
import { DagreDirection } from 'components/cd/pipelines/utils/nodeLayouter'

const HANDLE_SIZE = 8

export const NodeHandleSC = styled(Handle)<{
  $isConnected?: boolean
}>(({ theme, $isConnected }) => ({
  '&&': {
    visibility: $isConnected ? 'visible' : 'hidden',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderColor: theme.colors['border-selected'],
    borderWidth: theme.borderWidths.default,
    backgroundColor: theme.colors['border-selected'],
  },
}))

export const NodeBaseCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  borderColor: theme.colors['border-fill-two'],
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-two']
      : theme.colors['fill-zero'],
}))

export function NodeBase({
  id,
  additionalContent,
  children,
  ...props
}: Pick<NodeProps, 'id'> & {
  additionalContent?: ReactNode
  children: ReactNode
} & ComponentProps<typeof NodeBaseCardSC>) {
  const theme = useTheme()
  const { incomers, outgoers } = useNodeEdges(id)
  const { rankdir = 'LR' } = use(GraphLayoutCtx) ?? {}

  return (
    <>
      <NodeBaseCardSC
        {...props}
        css={{
          flexDirection: 'column',
          gap: theme.spacing.small,
          minWidth: 200,
          position: 'relative',
          padding: theme.spacing.small,
        }}
      >
        <NodeHandleSC
          type="target"
          isConnectable={false}
          $isConnected={!isEmpty(incomers.filter(isVisible))}
          position={directionToTargetPosition[rankdir]}
        />
        {children}
        <NodeHandleSC
          type="source"
          isConnectable={false}
          $isConnected={!isEmpty(outgoers.filter(isVisible))}
          position={directionToSourcePosition[rankdir]}
        />
      </NodeBaseCardSC>
      {additionalContent}
    </>
  )
}

export const directionToTargetPosition: Record<DagreDirection, Position> = {
  LR: Position.Left,
  TB: Position.Top,
  RL: Position.Right,
  BT: Position.Bottom,
}
export const directionToSourcePosition: Record<DagreDirection, Position> = {
  LR: Position.Right,
  TB: Position.Bottom,
  RL: Position.Left,
  BT: Position.Top,
}
