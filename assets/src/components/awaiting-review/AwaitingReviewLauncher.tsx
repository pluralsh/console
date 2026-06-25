import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import { useTransition, animated } from '@react-spring/web'
import { useAwaitingReview } from 'components/contexts/AwaitingReviewContext'
import { useTopLevelSidePanel } from 'components/layout/TopLevelSidePanel'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'styled-components'
import { AwaitingReviewLauncherButton } from './AwaitingReviewLauncherButton'
import { AwaitingReviewPanel } from './AwaitingReviewPanel'
import { WORKBENCH_LINK_HOVER_CARD_SELECTOR } from 'components/workbenches/common/WorkbenchLinkChip'

const PANEL_WIDTH = 460

export default function AwaitingReviewLauncher() {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((o) => !o), [])
  const { sidePanel } = useTopLevelSidePanel()
  const [panelPosition, setPanelPosition] = useState<{
    left?: number
    right?: number
    top: number
    transformOrigin: string
  }>()

  const transitions = useTransition(open ? [true] : [], {
    from: { opacity: 0, scale: 0.65 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.65 },
    config: { tension: 1000, friction: 55 },
  })

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, (event) => {
    const target = event.target
    if (target instanceof Node && panelRef.current?.contains(target)) {
      return
    }
    if (
      target instanceof Element &&
      target.closest(WORKBENCH_LINK_HOVER_CARD_SELECTOR)
    ) {
      return
    }
    setOpen(false)
  })

  const { stacks, agentRuns, count, loading, error } = useAwaitingReview()

  useLayoutEffect(() => {
    if (!open) return

    const launcherRect = ref.current?.getBoundingClientRect()
    if (!launcherRect) return

    const opensRight = !!sidePanel || launcherRect.right < PANEL_WIDTH

    setPanelPosition({
      left: opensRight ? launcherRect.left : undefined,
      right: opensRight ? undefined : window.innerWidth - launcherRect.right,
      top: launcherRect.bottom + theme.spacing.xsmall,
      transformOrigin: opensRight ? 'top left' : 'top right',
    })
  }, [open, sidePanel, theme.spacing.xsmall])

  return (
    <div
      ref={ref}
      css={{
        position: 'relative',
        zIndex: open ? theme.zIndexes.selectPopover : theme.zIndexes.modal,
      }}
    >
      <AwaitingReviewLauncherButton
        open={open}
        onClick={toggle}
        count={count}
      />
      {transitions((styles, item) =>
        item && panelPosition
          ? createPortal(
              <animated.div
                ref={panelRef}
                style={{
                  ...styles,
                  position: 'fixed',
                  zIndex: theme.zIndexes.selectPopover,
                  ...panelPosition,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <AwaitingReviewPanel
                  stacks={stacks}
                  agentRuns={agentRuns}
                  loading={loading}
                  error={error}
                  onClose={() => setOpen(false)}
                />
              </animated.div>,
              document.body
            )
          : null
      )}
    </div>
  )
}
