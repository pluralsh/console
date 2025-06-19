import { useCallback, useMemo, useRef, useState } from 'react'
import { useTransition } from '@react-spring/web'
import styled from 'styled-components'

import { useClickOutside, useKeyDown } from '@react-hooks-library/core'

import { AnimatedDiv } from '@pluralsh/design-system'

import { DocSearch } from './DocSearch'
import { HelpLauncherBtn } from './HelpLauncherBtn'
import { HelpMenu } from './HelpMenu'
import { useCustomEventListener } from './useCustomEventListener'

export enum HelpMenuState {
  menu = 'menu',
  docSearch = 'docSearch',
  // chatBot = 'chatBot',
}

export enum HelpOpenState {
  open = 'open',
  closed = 'closed',
}

const HelpLauncherSC = styled.div(({ theme }) => ({
  display: 'flex',
  width: '100%',
  position: 'relative',
  alignItems: 'end',
  paddingLeft: theme.spacing.xxsmall,
  pointerEvents: 'none',
  '& > *': {
    pointerEvents: 'auto',
  },
  zIndex: theme.zIndexes.modal,
}))

// @ts-ignore, see https://github.com/pmndrs/react-spring/issues/1515
const HelpLauncherContentSC = styled(AnimatedDiv)(({ theme }) => ({
  display: 'flex',
  position: 'absolute',
  right: -240 - theme.spacing.large,
  bottom: 0,
  width: 240,
  pointerEvents: 'none',
  '& > *': { pointerEvents: 'auto' },
}))

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
  const chatbotUnreadCount = 0

  const changeState = useCallback(
    (menuState?: HelpMenuState, openState?: HelpOpenState) => {
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
    []
  )

  // const minHelp = useCallback(() => {
  //   changeState(undefined, HelpOpenState.min)
  // }, [changeState])

  useLaunchEventListener((menu) => {
    changeState(menu, HelpOpenState.open)
  })

  const helpMenu = <HelpMenu changeState={changeState} />
  const contentOpts = {
    // [HelpMenuState.chatBot]: (
    //   <Chatbot
    //     onClose={closeHelp}
    //     onMin={minHelp}
    //   />
    // ),
    [HelpMenuState.docSearch]: null,
    [HelpMenuState.menu]: helpMenu,
  }

  const onLauncherClick = useCallback(
    (event) => {
      event.stopPropagation()
      if (
        openState === HelpOpenState.open &&
        menuState === HelpMenuState.menu
      ) {
        changeState(undefined, HelpOpenState.closed)
      } else {
        changeState(HelpMenuState.menu, HelpOpenState.open)
      }
    },
    [changeState, menuState, openState]
  )

  const isOpen = openState === HelpOpenState.open
  const transitionProps = useMemo(() => getTransitionProps(isOpen), [isOpen])
  const transitions = useTransition(isOpen ? [menuState] : [], transitionProps)

  const content = transitions((styles, menuState) => (
    <HelpLauncherContentSC
      style={{
        transformOrigin: 'bottom left',
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
        count={chatbotUnreadCount}
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
