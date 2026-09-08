import styled, { useTheme } from 'styled-components'
import { useTransition, animated } from '@react-spring/web'
import { useCallback, useRef, useState } from 'react'
import { useClickOutside, useKeyDown } from '@react-hooks-library/core'

import { useUnreadAppNotificationsQuery } from '../../generated/graphql'

import { NotificationsLauncherButton } from './NotificationsLauncherButton'
import { NotificationsPanel } from './NotificationsPanel'

const POLL_INTERVAL = 60 * 1000

export default function NotificationsLauncher() {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<boolean>(false)
  const toggle = useCallback(() => setOpen(!open), [open, setOpen])

  const transitions = useTransition(open ? [true] : [], {
    from: { opacity: 0, scale: 0.65 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.65 },
    config: { tension: 1000, friction: 55 },
  })

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, () => setOpen(false))

  const { data, refetch } = useUnreadAppNotificationsQuery({
    pollInterval: POLL_INTERVAL,
  })

  return (
    <div
      ref={ref}
      css={{ position: 'relative', zIndex: theme.zIndexes.modal }}
    >
      <NotificationsLauncherButton
        open={open}
        onClick={toggle}
        count={data?.unreadAppNotifications || 0}
      />
      {transitions((styles) => (
        <AnimatedWrapperSC style={styles}>
          <NotificationsPanel
            onClose={() => setOpen(false)}
            refetchUnreadNotificationsCount={refetch}
          />
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
  height: '70vh',
  transformOrigin: 'top right',
}))
