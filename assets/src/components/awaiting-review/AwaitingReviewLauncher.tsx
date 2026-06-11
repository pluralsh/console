import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import { useTransition, animated } from '@react-spring/web'
import { usePendingApprovalStacksQuery } from 'generated/graphql'
import { useCallback, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { AwaitingReviewLauncherButton } from './AwaitingReviewLauncherButton'
import { AwaitingReviewPanel } from './AwaitingReviewPanel'

const POLL_INTERVAL = 60 * 1000

export default function AwaitingReviewLauncher() {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((o) => !o), [])

  const transitions = useTransition(open ? [true] : [], {
    from: { opacity: 0, scale: 0.65 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.65 },
    config: { tension: 1000, friction: 55 },
  })

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, () => setOpen(false))

  const { data } = usePendingApprovalStacksQuery({
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const count = useMemo(
    () => mapExistingNodes(data?.infrastructureStacks).length,
    [data?.infrastructureStacks]
  )

  return (
    <div
      ref={ref}
      css={{ position: 'relative', zIndex: theme.zIndexes.modal }}
    >
      <AwaitingReviewLauncherButton
        open={open}
        onClick={toggle}
        count={count}
      />
      {transitions((styles) => (
        <AnimatedWrapperSC style={styles}>
          <AwaitingReviewPanel onClose={() => setOpen(false)} />
        </AnimatedWrapperSC>
      ))}
    </div>
  )
}

const AnimatedWrapperSC = styled(animated.div)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 32 + theme.spacing.xsmall,
  display: 'flex',
  flexDirection: 'column',
  transformOrigin: 'top right',
}))
