import styled, { DefaultTheme } from 'styled-components'
import { useTransition } from 'react-spring'
import { useCallback, useMemo, useRef, useState } from 'react'

import { useClickOutside, useKeyDown } from '@react-hooks-library/core'

import { AnimatedDiv } from '@pluralsh/design-system'

import { NotificationsLauncherButton } from './NotificationsLauncherButton'
import { HelpMenu } from './HelpMenu'

export const getHelpSpacing = (theme: DefaultTheme) => ({
  icon: {
    width: theme.spacing.xlarge,
    height: theme.spacing.xlarge,
  },
})

const HelpLauncherSC = styled.div(({ theme }) => ({
  display: 'flex',
  position: 'relative',
  alignItems: 'end',
  justifyContent: 'end',
  pointerEvents: 'none',
  '& > *': {
    pointerEvents: 'auto',
  },
  zIndex: theme.zIndexes.modal,
}))

// @ts-ignore, see https://github.com/pmndrs/react-spring/issues/1515
const HelpLauncherContentSC = styled(AnimatedDiv)(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    display: 'flex',
    position: 'absolute',
    left: 0,
    top: helpSpacing.icon.height + theme.spacing.xsmall,

    minWidth: 240,
    pointerEvents: 'none',
    '& > *': { pointerEvents: 'auto' },
  }
})

const getTransitionProps = (isOpen: boolean) => ({
  from: { opacity: 0, scale: `65%` },
  enter: { opacity: 1, scale: '100%' },
  leave: { opacity: 0, scale: `65%` },
  config: isOpen
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
  const [open, setOpen] = useState<boolean>(false)
  const toggle = useCallback(() => setOpen(!open), [open, setOpen])
  const transitionProps = useMemo(() => getTransitionProps(open), [open])
  const transitions = useTransition(open ? [true] : [], transitionProps)

  const unreadCount = 10 // TODO

  const content = transitions((styles) => (
    <HelpLauncherContentSC
      style={{
        transformOrigin: 'top left',
        ...styles,
      }}
    >
      <HelpMenu intercomProps={{ unreadCount }} />
    </HelpLauncherContentSC>
  ))

  // Close affordances
  const ref = useRef<HTMLDivElement>(null)

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, () => setOpen(false))

  return (
    <HelpLauncherSC ref={ref}>
      <NotificationsLauncherButton
        open={open}
        onClick={toggle}
        count={unreadCount}
      />
      {content}
    </HelpLauncherSC>
  )
}
