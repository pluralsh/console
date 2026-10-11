import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled from 'styled-components'

const DURATION = 200

// the width of the sidebar shown by the mounted tab layout, read by the next
// tab's layout as it renders (before the previous one unmounts)
let shownSidebarWidth = 0

// Holds a workbench tab's sidebar, animating its width from the previous
// sidebar's (0 for none) whenever it changes: sliding in, resizing between
// tabs, or sliding out to a tab without one.
export function WorkbenchSidebarSlot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [initialWidth] = useState(() => shownSidebarWidth)
  const widthRef = useRef(initialWidth)
  const animationRef = useRef<Animation>(null)

  // sidebars set their own (fixed) width, so it's measured from the content
  useLayoutEffect(() => {
    const slot = ref.current
    if (!slot) return
    const width =
      (slot.firstElementChild as Nullable<HTMLElement>)?.offsetWidth ?? 0
    const from = widthRef.current

    widthRef.current = width
    shownSidebarWidth = width
    if (from === width || prefersReducedMotion()) return

    animationRef.current?.cancel()
    animationRef.current = slot.animate(
      [{ width: `${from}px` }, { width: `${width}px` }],
      { duration: DURATION, easing: 'ease-out' }
    )
  })

  useEffect(
    () => () => {
      shownSidebarWidth = 0
    },
    []
  )

  return <SlotSC ref={ref}>{children}</SlotSC>
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// the background stands in for the outgoing sidebar while it shrinks away;
// content is right-aligned so it slides in rather than being uncovered
const SlotSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  flexShrink: 0,
  alignSelf: 'stretch',
  minHeight: 0,
  overflow: 'hidden',
  backgroundColor: theme.colors['fill-accent'],
}))
