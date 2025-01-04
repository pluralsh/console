import { Dispatch, SetStateAction, useMemo, useRef, useState } from 'react'
import { Checkbox, Flex, P, useOutsideClick } from 'honorable'
import { AnimatedDiv, CloseIcon, IconFrame } from '@pluralsh/design-system'
import { useTransition } from 'react-spring'

import styled from 'styled-components'

import { NotificationsPanel } from './NotificationsPanel'

const PANEL_WIDTH = 480

const getTransitionProps = (isOpen: boolean) => ({
  from: { opacity: 0, translateX: `${-PANEL_WIDTH}px` },
  enter: { opacity: 1, translateX: '0px' },
  leave: { opacity: 0, translateX: `${-PANEL_WIDTH}px` },
  config: isOpen
    ? {
        mass: 0.6,
        tension: 280,
        velocity: 0.02,
      }
    : {
        mass: 0.6,
        tension: 400,
        velocity: 0.02,
        restVelocity: 0.1,
      },
})

const Wrapper = styled(AnimatedDiv)(({ theme }) => ({
  position: 'absolute',
  display: 'flex',
  alignItems: 'flex-end',
  top: 0,
  right: '0',
  overflow: 'hidden',
  transform: `translateX(100%)`,
  height: `calc(100% - ${theme.spacing.xxxlarge}px)`,
}))

const Animated = styled(AnimatedDiv)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.colors['fill-one'],
  width: PANEL_WIDTH,
  height: `calc(100% - ${theme.spacing.medium}px)`,
  borderTop: theme.borders.default,
  borderRight: theme.borders.default,
  borderTopRightRadius: 6,
}))

export function NotificationsPanelOverlay({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}) {
  const notificationsPanelRef = useRef<any>(undefined)
  const [all, setAll] = useState<boolean>(false)

  useOutsideClick(notificationsPanelRef, () => {
    setIsOpen(false)
  })

  const transitionProps = useMemo(() => getTransitionProps(isOpen), [isOpen])
  const transitions = useTransition(isOpen ? [true] : [], transitionProps)

  return transitions((styles) => (
    <Wrapper>
      <Animated
        style={styles}
        ref={notificationsPanelRef}
      >
        <Flex
          align="center"
          justify="space-between"
          padding="medium"
          borderBottom="1px solid border"
        >
          <P subtitle2>Notifications</P>
          <Flex
            align="center"
            gap="small"
            justify="center"
            padding="xsmall"
          >
            <Checkbox
              checked={all}
              onChange={() => setAll(!all)}
              onClick={(e) => e.stopPropagation()}
              small
            >
              Show all notifications
            </Checkbox>
            <IconFrame
              clickable
              icon={<CloseIcon />}
              tooltip
              textValue="Close notification panel"
              onClick={() => setIsOpen(false)}
            />
          </Flex>
        </Flex>
        <Flex
          flexGrow={1}
          direction="column"
          overflowY="auto"
        >
          <NotificationsPanel
            closePanel={() => setIsOpen(false)}
            all={all}
          />
        </Flex>
      </Animated>
    </Wrapper>
  ))
}
