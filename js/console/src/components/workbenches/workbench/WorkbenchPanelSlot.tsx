import { Ref } from 'react'
import styled from 'styled-components'

export type WorkbenchPanelEdge = 'left' | 'right'

// Persistent home for the panel docked to one edge of the workbench tabs (the
// sidebar on the left, display options on the right). Tabs portal their panel
// in and declare its width, which transitions as they switch, so panels slide
// in, out or resize between tabs rather than snapping.
export function WorkbenchPanelSlot({
  ref,
  edge,
  width,
  resizing = false,
}: {
  ref: Ref<HTMLDivElement>
  edge: WorkbenchPanelEdge
  width: number
  // a panel being dragged to a new width has to track the pointer
  resizing?: boolean
}) {
  return (
    <SlotSC
      ref={ref}
      $edge={edge}
      $resizing={resizing}
      style={{ width }}
    />
  )
}

// the background stands in for the outgoing panel while it shrinks away;
// content hugs the page edge so it slides in rather than being uncovered
const SlotSC = styled.div<{ $edge: WorkbenchPanelEdge; $resizing: boolean }>(
  ({ theme, $edge, $resizing }) => ({
    display: 'flex',
    justifyContent: $edge === 'left' ? 'flex-end' : 'flex-start',
    flexShrink: 0,
    alignSelf: 'stretch',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: theme.colors['fill-accent'],
    transition: $resizing ? 'none' : 'width 200ms ease-out',
    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    '& > *': { flexShrink: 0 },
  })
)
