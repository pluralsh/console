// import { Button, usePrevious } from '@pluralsh/design-system'
import styled, { DefaultTheme, useTheme } from 'styled-components'
import { animated, useTransition } from 'react-spring'
import { useCallback, useMemo, useState } from 'react'

import Chatbot from './Chatbot'
import { DocSearch } from './DocSearch'
import { useHandleIntercom } from './useHandleIntercom'
import { HelpLauncherBtn, HelpLauncherButtonsSC } from './HelpLauncherBtn'
import { HelpMenu } from './HelpMenu'
import { HelpMaximizeBtn } from './HelpMaximizeBtn'
import { useIntercomUpdateUnread } from './IntercomUpdateUnread'
import { useCustomEventListener } from './useCustomEventListener'

export const getHelpSpacing = (theme: DefaultTheme) => ({
  gap: {
    vertical: theme.spacing.xsmall,
    horizontal: theme.spacing.xsmall,
  },
  // Intercom has a hard-minimum horizontal padding of 20px
  // So padding.right must be 20px or larger
  padding: {
    right: theme.spacing.large + theme.spacing.medium,
    left: theme.spacing.large,
    top: theme.spacing.large,
    bottom: 0,
  },
  icon: {
    width: theme.spacing.xxlarge,
    height: theme.spacing.xxlarge - theme.spacing.xxsmall,
  },
})

export function useHelpSpacing() {
  const theme = useTheme()

  return getHelpSpacing(theme)
}

export const HELP_RIGHT_PAD = 32

export const HELP_BOTTOM_PAD = 32

export const BTN_OVERSHOOT = 20

export enum HelpMenuState {
  menu = 'menu',
  docSearch = 'docSearch',
  chatBot = 'chatBot',
  intercom = 'intercom',
}

export enum HelpOpenState {
  open = 'open',
  closed = 'closed',
  min = 'min',
}

const HelpLauncherSC = styled.div(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    position: 'fixed',
    // Must be greater than 2147483000 to appear above Intercom iframe
    zIndex: 2147483000 + 100,
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'end',
    right: helpSpacing.padding.right,
    bottom: helpSpacing.padding.bottom,
    top: helpSpacing.padding.top,
    left: helpSpacing.padding.left,
    pointerEvents: 'none',
    '& > *': {
      pointerEvents: 'auto',
    },
  }
})
const HelpLauncherContentSC = styled(animated.div)(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    display: 'flex',
    position: 'absolute',
    right: 0,
    left: 0,
    top: 0,
    bottom: helpSpacing.icon.height + helpSpacing.gap.vertical,
    alignItems: 'end',
    justifyContent: 'end',
    pointerEvents: 'none',
    '& > *': {
      pointerEvents: 'auto',
    },
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

const HELP_LAUNCH_EVENT_TYPE = 'pluralHelpLaunchEvent'

type HelpLaunchEventProps = { menu: HelpMenuState }
type HelpLaunchEvent = CustomEvent<HelpLaunchEventProps>
const HelpLaunchEvent = CustomEvent<HelpLaunchEventProps>

export function launchHelp(section: HelpMenuState) {
  const event = new HelpLaunchEvent(HELP_LAUNCH_EVENT_TYPE, {
    detail: { menu: section },
  })

  window.dispatchEvent(event)
}

function useLaunchEventListener(cb: (menu: HelpMenuState) => void) {
  useCustomEventListener<HelpLaunchEvent>(
    HELP_LAUNCH_EVENT_TYPE,
    useCallback(
      (e) => {
        const { menu } = e.detail

        if (Object.values(HelpMenuState).includes(menu)) {
          cb(menu)
        }
      },
      [cb]
    )
  )
}

const useWatchIntercomMiniChat = () => {}

function HelpLauncher() {
  const [menuState, setMenuState] = useState<HelpMenuState>(HelpMenuState.menu)
  const [openState, setOpenState] = useState<HelpOpenState>(
    HelpOpenState.closed
  )
  const [intercomUnreadCount, setIntercomUnreadCount] = useState(0)
  const chatbotUnreadCount = 0

  useWatchIntercomMiniChat()

  const closeHelp = useCallback(() => {
    setMenuState(HelpMenuState.menu)
    setOpenState(HelpOpenState.closed)
  }, [])

  const minHelp = useCallback(() => {
    setOpenState(HelpOpenState.min)
  }, [])

  useHandleIntercom({
    menuState,
    openState,
    setMenuState,
    setOpenState,
    closeHelp,
  })
  useIntercomUpdateUnread(setIntercomUnreadCount)

  useLaunchEventListener((menu) => {
    setMenuState(menu)
    setOpenState(HelpOpenState.open)
  })

  const helpMenu = (
    <HelpMenu
      setHelpMenuState={setMenuState}
      setHelpOpenState={setOpenState}
      intercomProps={{ unreadCount: intercomUnreadCount }}
    />
  )
  const contentOpts = {
    [HelpMenuState.chatBot]: (
      <Chatbot
        onClose={closeHelp}
        onMin={minHelp}
      />
    ),
    [HelpMenuState.docSearch]: null,
    [HelpMenuState.intercom]: null,
    [HelpMenuState.menu]: helpMenu,
  }

  const onLauncherClick = useCallback(() => {
    if (openState === HelpOpenState.open && menuState === HelpMenuState.menu) {
      setOpenState(HelpOpenState.closed)
    } else {
      setOpenState(HelpOpenState.open)
      setMenuState(HelpMenuState.menu)
    }
  }, [menuState, openState])

  const onMaximizeClick = useCallback(() => {
    if (openState === 'closed' || openState === 'min') {
      setOpenState(HelpOpenState.open)
    } else {
      setOpenState(HelpOpenState.min)
    }
  }, [openState])

  const isOpen = openState === HelpOpenState.open
  const transitionProps = useMemo(() => getTransitionProps(isOpen), [isOpen])
  const transitions = useTransition(isOpen ? [menuState] : [], transitionProps)

  const content = transitions((styles, menuState) => (
    <HelpLauncherContentSC
      style={{
        transformOrigin: 'bottom right',
        ...styles,
      }}
    >
      {contentOpts[menuState]}
    </HelpLauncherContentSC>
  ))

  return (
    <HelpLauncherSC>
      <HelpLauncherButtonsSC>
        {openState === HelpOpenState.min && (
          <HelpMaximizeBtn onClick={onMaximizeClick} />
        )}
        <HelpLauncherBtn
          variant={
            menuState === HelpMenuState.menu && openState === HelpOpenState.open
              ? 'minimize'
              : 'help'
          }
          onClick={onLauncherClick}
          count={intercomUnreadCount + chatbotUnreadCount}
        />
      </HelpLauncherButtonsSC>
      {content}
      <DocSearch
        isOpen={menuState === HelpMenuState.docSearch}
        onClose={() => {
          if (menuState === HelpMenuState.docSearch) {
            setMenuState(HelpMenuState.menu)
            setOpenState(HelpOpenState.closed)
          }
        }}
      />
    </HelpLauncherSC>
  )
}

export default HelpLauncher
