import styled, { useTheme } from 'styled-components'
import { Handle, NodeProps, Position } from 'reactflow'
import { Card } from '@pluralsh/design-system'
import { ComponentProps, ReactNode } from 'react'

import isEmpty from 'lodash/isEmpty'

import { useNodeEdges } from '../../hooks/reactFlowHooks'

const HANDLE_SIZE = 8

export const NodeHandle = styled(Handle)<{
  $isConnected?: boolean
  $isOpen?: boolean
}>(({ theme, $isConnected, $isOpen = true }) => ({
  '&&': {
    visibility: $isConnected ? 'visible' : 'hidden',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderColor: $isOpen
      ? theme.colors['border-secondary']
      : theme.colors.border,
    borderWidth: theme.borderWidths.default,
    backgroundColor: theme.colors['fill-zero'],
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
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-two']
      : theme.colors['fill-zero'],
}))

export function NodeBase({
  id,
  children,
  ...props
}: NodeProps & { children: ReactNode } & ComponentProps<typeof NodeBaseCard>) {
  const theme = useTheme()
  const { incomers, outgoers } = useNodeEdges(id)

  return (
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
        $isConnected={!isEmpty(incomers)}
        position={Position.Left}
        css={{
          '&&': {
            backgroundColor: theme.colors.border,
            borderColor: theme.colors.border,
          },
        }}
      />
      {children}
      <NodeHandle
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        position={Position.Right}
        css={{
          '&&': {
            backgroundColor: theme.colors.border,
            borderColor: theme.colors.border,
          },
        }}
      />
    </NodeBaseCard>
  )
}
