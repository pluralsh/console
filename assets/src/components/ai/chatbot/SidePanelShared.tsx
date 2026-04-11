import { ReactNode } from 'react'
import styled from 'styled-components'

const HANDLE_THICKNESS = 20
export const SIDE_PANEL_HEADER_HEIGHT = 57

export function SidePanelContent({ children }: { children: ReactNode }) {
  return (
    <SidePanelWrapperSC>
      <ResizeGripSC />
      {children}
    </SidePanelWrapperSC>
  )
}

const SidePanelWrapperSC = styled.div(({ theme }) => ({
  position: 'relative',
  zIndex: theme.zIndexes.modal,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: 'var(--side-panel-width)',
  borderLeft: theme.borders.default,
  background: theme.colors['fill-accent'],
}))

export const PanelHeaderSC = styled.div(({ theme }) => ({
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: SIDE_PANEL_HEADER_HEIGHT,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders.default,
  flexShrink: 0,
}))

export const ResizeGripSC = styled.div(({ theme }) => ({
  borderLeft: theme.borders.default,
  height: 40,
  left: 2,
  position: 'absolute',
  top: 'calc(50% - 20px)',
  width: 5,

  '&:after': {
    borderLeft: theme.borders.default,
    content: '""',
    height: 30,
    left: 2,
    position: 'absolute',
    top: 'calc(50% - 15px)',
    width: 5,
  },
}))

export const DragHandleSC = styled.div<{ $isDragging: boolean }>(
  ({ theme, $isDragging }) => ({
    position: 'absolute',
    zIndex: theme.zIndexes.modal,
    left: -HANDLE_THICKNESS / 2,
    top: 0,
    width: HANDLE_THICKNESS,
    height: '100%',
    cursor: 'ew-resize',
    background: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
    '&::before': {
      content: '""',
      pointerEvents: 'none',
      width: HANDLE_THICKNESS / 4,
      background: $isDragging ? theme.colors['icon-primary'] : 'transparent',
      transition: 'background 0.2s ease-in-out',
    },
  })
)
