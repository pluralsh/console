import styled from 'styled-components'
import { Handle } from 'reactflow'

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
