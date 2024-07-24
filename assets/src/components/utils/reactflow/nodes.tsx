import styled, { useTheme } from 'styled-components'
import { Handle, NodeProps, Position } from 'reactflow'
import { Card } from '@pluralsh/design-system'
import { ComponentProps, ReactNode } from 'react'

import isEmpty from 'lodash/isEmpty'

import { useNodeEdges } from '../../hooks/reactFlowHooks'

import { isVisible } from './edges'

const HANDLE_SIZE = 8

export const NodeHandle = styled(Handle)<{
  $isConnected?: boolean
  $isOpen?: boolean
}>(({ theme, $isConnected }) => ({
  '&&': {
    visibility: $isConnected ? 'visible' : 'hidden',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderColor: theme.colors['border-selected'],
    borderWidth: theme.borderWidths.default,
    backgroundColor: theme.colors['border-selected'],
    '&.react-flow__handle-left': {
      left: -HANDLE_SIZE / 2,
    },
    '&.react-flow__handle-right': {
      right: -HANDLE_SIZE / 2,
    },
  },
}))

export const NodeBaseCard = styled(Card)(({ theme }) => ({
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
}: NodeProps & {
  additionalContent?: ReactNode
  children: ReactNode
} & ComponentProps<typeof NodeBaseCard>) {
  const theme = useTheme()
  const { incomers, outgoers } = useNodeEdges(id)

  return (
    <>
      <NodeBaseCard
        {...props}
        css={{
          flexDirection: 'column',
          gap: theme.spacing.small,
          minWidth: 200,
          position: 'relative',
          padding: theme.spacing.small,
        }}
      >
        <NodeHandle
          type="target"
          isConnectable={false}
          $isConnected={!isEmpty(incomers.filter(isVisible))}
          position={Position.Left}
        />
        {children}
        <NodeHandle
          type="source"
          isConnectable={false}
          $isConnected={!isEmpty(outgoers.filter(isVisible))}
          position={Position.Right}
        />
      </NodeBaseCard>
      {additionalContent}
    </>
  )
}
