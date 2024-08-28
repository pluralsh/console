import { useTheme } from 'styled-components'
import { useTransition } from 'react-spring'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import { AnimatedDiv } from '@pluralsh/design-system'

import { NotificationsLauncherButton } from './NotificationsLauncherButton'
import { NotificationsPanel } from './NotificationsPanel'

const getTransitionProps = (open: boolean) => ({
  from: { opacity: 0, scale: `65%` },
  enter: { opacity: 1, scale: '100%' },
  leave: { opacity: 0, scale: `65%` },
  config: open
    ? {
        mass: 0.6,
        tension: 280,
        velocity: 0.02,
      }
    : {
        mass: 0.6,
        tension: 600,
        velocity: 0.04,
        restVelocity: 0.1,
      },
})

export default function NotificationsLauncher() {
  const theme = useTheme()
  const [open, setOpen] = useState<boolean>(false)
  const toggle = useCallback(() => setOpen(!open), [open, setOpen])
  const transitionProps = useMemo(() => getTransitionProps(open), [open])
  const transitions = useTransition(open ? [true] : [], transitionProps)

  const unreadCount = 10 // TODO

  const content = transitions((styles) => (
    <AnimatedDiv
      css={{
        display: 'flex',
        maxHeight: 640,
        minHeight: 240,
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 32 + theme.spacing.xsmall,
        width: 480,

        '& > *': { pointerEvents: 'auto' },
      }}
      style={{
        transformOrigin: 'top right',
        ...styles,
      }}
    >
      <NotificationsPanel />
    </AnimatedDiv>
  ))

  // Close affordances
  const ref = useRef<HTMLDivElement>(null)

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, () => setOpen(false))

  return (
    <div
      ref={ref}
      css={{
        display: 'flex',
        position: 'relative',
        alignItems: 'end',
        justifyContent: 'end',
        pointerEvents: 'none',
        '& > *': {
          pointerEvents: 'auto',
        },
        zIndex: theme.zIndexes.modal,
      }}
    >
      <NotificationsLauncherButton
        open={open}
        onClick={toggle}
        count={unreadCount}
      />
      {content}
    </div>
  )
}
