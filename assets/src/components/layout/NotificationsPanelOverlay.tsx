import {
  Dispatch,
  SetStateAction,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Checkbox,
  Flex,
  P,
  useOutsideClick,
} from 'honorable'
import { CloseIcon, IconFrame } from '@pluralsh/design-system'
import { animated, useTransition } from 'react-spring'

import styled from 'styled-components'

import { useContentOverlay } from './Overlay'
import { NotificationsPanel } from './NotificationsPanel'

const PANEL_WIDTH = 480
const PANEL_HEIGHT = 464

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

const Wrapper = styled(animated.div)<{$leftOffset:number}>(({ $leftOffset, theme }) => ({
  position: 'fixed',
  display: 'flex',
  alignItems: 'flex-end',
  top: 0,
  bottom: 0,
  left: $leftOffset,
  right: 0,
  zIndex: theme.zIndexes.selectPopover - 1,
  overflow: 'hidden',
}))

const Animated = styled(animated.div)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.colors['fill-one'],
  width: PANEL_WIDTH,
  height: PANEL_HEIGHT,
  borderTop: theme.borders.default,
  borderRight: theme.borders.default,
  borderTopRightRadius: 6,
}))

export function NotificationsPanelOverlay({
  leftOffset,
  isOpen,
  setIsOpen,
}: {
  leftOffset: number
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}) {
  const notificationsPanelRef = useRef<any>()
  const [all, setAll] = useState<boolean>(false)

  useContentOverlay(isOpen)

  useOutsideClick(notificationsPanelRef, () => {
    setIsOpen(false)
  })

  const transitionProps = useMemo(() => getTransitionProps(isOpen),
    [isOpen])
  const transitions = useTransition(isOpen ? [true] : [], transitionProps)

  return transitions(styles => (

    <Wrapper $leftOffset={leftOffset}>
      <Animated style={styles}>
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
