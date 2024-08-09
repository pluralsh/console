import styled, { DefaultTheme, useTheme } from 'styled-components'
import { useTransition } from 'react-spring'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useClickOutside, useKeyDown } from '@react-hooks-library/core'

import { AnimatedDiv } from '@pluralsh/design-system'

import { DocSearch } from './DocSearch'
import { useHandleIntercom } from './useHandleIntercom'
import { HelpLauncherBtn } from './HelpLauncherBtn'
import { HelpMenu } from './HelpMenu'
import { useIntercomUpdateUnread } from './IntercomUpdateUnread'
import { useCustomEventListener } from './useCustomEventListener'
import { useIntercomMini as useIntercomMiniChat } from './useIntercomMini'

export const getHelpSpacing = (theme: DefaultTheme) => ({
  // Intercom has a hard-minimum horizontal padding of 20px
  // So padding.right must be 20px or larger
  padding: {
    right: theme.spacing.xxlarge,
    left: theme.spacing.xxlarge,
    top: theme.spacing.xxlarge,
    bottom: theme.spacing.xxlarge,
  },
  icon: {
    width: theme.spacing.xlarge,
    height: theme.spacing.xlarge,
  },
})

export function useHelpSpacing() {
  const theme = useTheme()

  return getHelpSpacing(theme)
}

export enum HelpMenuState {
  menu = 'menu',
  docSearch = 'docSearch',
  // chatBot = 'chatBot',
  intercom = 'intercom',
  intercomMini = 'intercomMini',
}

export enum HelpOpenState {
  open = 'open',
  closed = 'closed',
}

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

function HelpLauncher() {
  const [menuState, setMenuState] = useState<HelpMenuState>(HelpMenuState.menu)
  const [openState, setOpenState] = useState<HelpOpenState>(
    HelpOpenState.closed
  )
  const [intercomUnreadCount, setIntercomUnreadCount] = useState(0)
  const chatbotUnreadCount = 0
  const { isOpen: intercomMiniIsOpen, close: closeIntercomMini } =
    useIntercomMiniChat()

  const changeState = useCallback(
    (menuState?: HelpMenuState, openState?: HelpOpenState) => {
      if (
        intercomMiniIsOpen &&
        // menuState !== HelpMenuState.intercom &&
        menuState !== HelpMenuState.intercomMini
      ) {
        closeIntercomMini()
      }
      if (menuState !== undefined) {
        setMenuState(menuState)
      }
      if (openState !== undefined) {
        setOpenState(openState)
        if (!openState) {
          setMenuState(HelpMenuState.menu)
        }
      }
    },
    [closeIntercomMini, intercomMiniIsOpen]
  )

  useEffect(() => {
    if (intercomMiniIsOpen) {
      changeState(HelpMenuState.intercomMini, HelpOpenState.open)
    }
  }, [changeState, intercomMiniIsOpen])

  const closeHelp = useCallback(() => {
    changeState(HelpMenuState.menu, HelpOpenState.closed)
  }, [changeState])

  // const minHelp = useCallback(() => {
  //   changeState(undefined, HelpOpenState.min)
  // }, [changeState])

  useHandleIntercom({
    menuState,
    openState,
    changeState,
    closeHelp,
  })
  useIntercomUpdateUnread(setIntercomUnreadCount)

  useLaunchEventListener((menu) => {
    changeState(menu, HelpOpenState.open)
  })

  const helpMenu = (
    <HelpMenu
      changeState={changeState}
      intercomProps={{ unreadCount: intercomUnreadCount }}
    />
  )
  const contentOpts = {
    // [HelpMenuState.chatBot]: (
    //   <Chatbot
    //     onClose={closeHelp}
    //     onMin={minHelp}
    //   />
    // ),
    [HelpMenuState.docSearch]: null,
    [HelpMenuState.intercom]: null,
    [HelpMenuState.intercomMini]: null,
    [HelpMenuState.menu]: helpMenu,
  }

  const onLauncherClick = useCallback(() => {
    if (openState === HelpOpenState.open && menuState === HelpMenuState.menu) {
      changeState(undefined, HelpOpenState.closed)
    } else {
      changeState(HelpMenuState.menu, HelpOpenState.open)
    }
  }, [changeState, menuState, openState])

  const isOpen = openState === HelpOpenState.open
  const transitionProps = useMemo(() => getTransitionProps(isOpen), [isOpen])
  const transitions = useTransition(isOpen ? [menuState] : [], transitionProps)

  const content = transitions((styles, menuState) => (
    <HelpLauncherContentSC
      style={{
        transformOrigin: 'top left',
        ...styles,
      }}
    >
      {contentOpts[menuState]}
    </HelpLauncherContentSC>
  ))

  // Close affordances
  const ref = useRef<HTMLDivElement>(null)

  useKeyDown(['Escape'], () => changeState(undefined, HelpOpenState.closed))
  useClickOutside(ref, () => changeState(undefined, HelpOpenState.closed))

  return (
    <HelpLauncherSC ref={ref}>
      <HelpLauncherBtn
        variant={
          menuState === HelpMenuState.menu && openState === HelpOpenState.open
            ? 'minimize'
            : 'help'
        }
        onClick={onLauncherClick}
        count={intercomUnreadCount + chatbotUnreadCount}
      />
      {content}
      <DocSearch
        isOpen={menuState === HelpMenuState.docSearch}
        onClose={() => {
          if (menuState === HelpMenuState.docSearch) {
            changeState(HelpMenuState.menu, HelpOpenState.closed)
          }
        }}
      />
    </HelpLauncherSC>
  )
}

export default HelpLauncher
