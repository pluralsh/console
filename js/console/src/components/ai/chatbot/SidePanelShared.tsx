import { ReactNode } from 'react'
import styled from 'styled-components'

const HANDLE_THICKNESS = 20
export const SIDE_PANEL_HEADER_HEIGHT = 55

export function SidePanelContent({
  children,
  hideResizeChrome = false,
}: {
  children: ReactNode
  hideResizeChrome?: boolean
}) {
  return (
    <SidePanelWrapperSC $hideResizeChrome={hideResizeChrome}>
      {!hideResizeChrome && <ResizeGripSC />}
      {children}
    </SidePanelWrapperSC>
  )
}

const SidePanelWrapperSC = styled.div<{ $hideResizeChrome?: boolean }>(
  ({ theme, $hideResizeChrome }) => ({
    position: 'relative',
    zIndex: theme.zIndexes.modal,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: 'var(--side-panel-width)',
    borderLeft: $hideResizeChrome ? 'none' : theme.borders.hairline,
    background: theme.colors['fill-accent'],
  })
)

export const PanelHeaderSC = styled.div(({ theme }) => ({
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: SIDE_PANEL_HEADER_HEIGHT,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders.hairline,
  flexShrink: 0,
}))

export const ResizeGripSC = styled.div(({ theme }) => ({
  borderLeft: theme.borders.hairline,
  height: 40,
  left: 2,
  position: 'absolute',
  top: 'calc(50% - 20px)',
  width: 5,

  '&:after': {
    borderLeft: theme.borders.hairline,
    content: '""',
    height: 30,
    left: 2,
    position: 'absolute',
    top: 'calc(50% - 15px)',
    width: 5,
  },
}))

export const DragHandleSC = styled.div<{ $isDragging?: boolean }>(
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
      content: $isDragging ? '""' : 'none',
      pointerEvents: 'none',
      width: HANDLE_THICKNESS / 4,
      height: '100%',
      background: theme.colors['icon-primary'],
    },
  })
)
