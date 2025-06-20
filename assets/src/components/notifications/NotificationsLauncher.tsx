import { useTheme } from 'styled-components'
import { useTransition } from '@react-spring/web'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import { AnimatedDiv } from '@pluralsh/design-system'

import { useUnreadAppNotificationsQuery } from '../../generated/graphql'

import { NotificationsLauncherButton } from './NotificationsLauncherButton'
import { NotificationsPanel } from './NotificationsPanel'

const POLL_INTERVAL = 5 * 1000

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
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<boolean>(false)
  const toggle = useCallback(() => setOpen(!open), [open, setOpen])
  const transitionProps = useMemo(() => getTransitionProps(open), [open])
  const transitions = useTransition(open ? [true] : [], transitionProps)

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, () => setOpen(false))

  const { data, refetch } = useUnreadAppNotificationsQuery({
    pollInterval: POLL_INTERVAL,
  })

  const content = transitions((styles) => (
    <AnimatedDiv
      css={{
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        height: '70vh',
        top: 32 + theme.spacing.xsmall,
        '& > *': { pointerEvents: 'auto' },
      }}
      style={{
        transformOrigin: 'top right',
        ...styles,
      }}
    >
      <NotificationsPanel
        onClose={() => setOpen(false)}
        refetchUnreadNotificationsCount={refetch}
      />
    </AnimatedDiv>
  ))

  return (
    <div
      ref={ref}
      css={{
        position: 'relative',
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
        count={data?.unreadAppNotifications || 0}
      />
      {content}
    </div>
  )
}
