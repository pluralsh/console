// import { Button, usePrevious } from '@pluralsh/design-system'
import { Merge } from 'type-fest'
import styled, { DefaultTheme, useTheme } from 'styled-components'
import { useVisuallyHidden } from 'react-aria'
import { animated, useTransition } from 'react-spring'

import {
  ComponentProps,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Button,
  Card,
  CaretDownIcon,
  CaretUpIcon,
  DocumentIcon,
  LifePreserverIcon,
  usePrevious,
} from '@pluralsh/design-system'

import { useIntercom } from 'react-use-intercom'

import HelpIcon from './HelpIcon'
import Chatbot from './Chatbot'
import ChatIcon from './ChatIcon'
import { DocSearch } from './DocSearch'

const getHelpSpacing = (theme: DefaultTheme) => ({
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

const BTN_OVERSHOOT = 20

const HelpLauncherButtonsSC = styled.div(({ theme }) => ({
  zIndex: 1,
  display: 'flex',
  gap: theme.spacing.small,
  '&&': {
    pointerEvents: 'none',
  },
  '& > *': {
    pointerEvents: 'auto',
  },
}))

const HelpLauncherBtnCount = styled(CountBadge)(({ count = 0 }) => {
  const translate = count > 10 ? -6 : -5

  return {
    position: 'absolute',
    top: translate,
    left: translate,
  }
})

const HelpLauncherBtnSC = styled.button(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    ...theme.partials.reset.button,
    position: 'relative',
    width: helpSpacing.icon.width,
    height: helpSpacing.icon.height + BTN_OVERSHOOT,
    paddingBottom: BTN_OVERSHOOT,
    transform: `translateY(${BTN_OVERSHOOT}px)`,
    background: theme.colors['action-primary'],
    borderStyle: 'solid',
    borderWidth: `1px 1px 0px 1px`,
    borderTopLeftRadius: theme.borderRadiuses.medium,
    borderTopRightRadius: theme.borderRadiuses.medium,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderColor: theme.colors['border-primary'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    boxShadow: theme.boxShadows.moderate,
    transition: 'transform 0.2s ease',

    '&:hover': {
      background: theme.colors['action-primary-hover'],
      transform: `translateY(${BTN_OVERSHOOT - theme.spacing.xsmall / 4}px)`,
    },
    '&:focus-visible': {
      background: theme.colors['action-primary-hover'],
      border: theme.borders['outline-focused'],
    },
  }
})

function HelpLauncherBtn({
  variant,
  count = 0,
  ...props
}: Merge<
  ComponentProps<typeof HelpLauncherBtnSC>,
  { variant: 'help' | 'minimize'; count?: number }
>) {
  const { visuallyHiddenProps } = useVisuallyHidden()
  const theme = useTheme()
  const iconProps = {
    size: 24,
    color: theme.colors['icon-light'],
  }

  return (
    <HelpLauncherBtnSC {...props}>
      {variant === 'minimize' ? (
        <CaretDownIcon {...iconProps} />
      ) : (
        <HelpIcon {...iconProps} />
      )}
      <span {...visuallyHiddenProps}>Help</span>
      {count > 0 && variant === 'help' && (
        <HelpLauncherBtnCount
          size="medium"
          count={count}
        />
      )}
    </HelpLauncherBtnSC>
  )
}

const HelpMaximizeBtnSC = styled(HelpLauncherBtnSC)(({ theme }) => ({
  background: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  '&:hover': {
    background: theme.colors['fill-two-hover'],
    transform: `translateY(${BTN_OVERSHOOT - theme.spacing.xsmall / 2}px)`,
  },
  '&:focus-visible': {
    background: theme.colors['fill-two'],
    border: theme.borders['outline-focused'],
  },
}))

function HelpMaximizeBtn(props: ComponentProps<typeof HelpLauncherBtnSC>) {
  const { visuallyHiddenProps } = useVisuallyHidden()
  const theme = useTheme()

  return (
    <HelpMaximizeBtnSC {...props}>
      <CaretUpIcon
        size={24}
        color={theme.colors['icon-light']}
      />
      <span {...visuallyHiddenProps}>Maximize help</span>
    </HelpMaximizeBtnSC>
  )
}

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

const CountBadgeSC = styled.div<{
  $size?: 'small' | 'medium'
  $count?: number
}>(({ $count = 0, $size = 'medium', theme }) => {
  const width =
    $size === 'small' ? ($count >= 10 ? 18 : 14) : $count >= 10 ? 18 : 16
  const fontSize = $size === 'small' ? 10.5 : $count >= 10 ? 10.5 : 12

  return {
    ...theme.partials.text.badgeLabel,
    color: theme.colors.text,
    letterSpacing: 0,
    fontSize,
    width,
    height: width,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors['icon-danger-critical'],
    borderRadius: '50%',
  }
})

function CountBadge({
  count,
  size = 'medium',
  ...props
}: {
  count?: number
  size?: 'small' | 'medium'
}) {
  return (
    <CountBadgeSC
      $count={count}
      $size={size}
      {...props}
    >
      {count}
    </CountBadgeSC>
  )
}

const HelpMenuButtonSC = styled(Button)(({ theme }) => ({
  boxShadow: theme.boxShadows.slight,
}))

function HelpMenuButton({
  count,
  ...props
}: Merge<ComponentProps<typeof Button>, { count?: number }>) {
  return (
    <HelpMenuButtonSC
      $count={count}
      secondary
      endIcon={
        count ? (
          <CountBadge
            size="small"
            count={count}
          />
        ) : undefined
      }
      {...props}
    />
  )
}

const HelpMenuSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.medium,
  flexDirection: 'column',
  rowGap: theme.spacing.medium,
  boxShadow: theme.boxShadows.modal,
  '.heading': {
    margin: 0,
    ...theme.partials.text.overline,
  },
}))

function HelpMenu({
  setHelpMenuState,
  setHelpOpenState,
  intercomProps,
  ...props
}: Merge<
  ComponentProps<typeof HelpMenuSC>,
  {
    setHelpMenuState: Dispatch<SetStateAction<HelpMenuState>>
    setHelpOpenState: Dispatch<SetStateAction<HelpOpenState>>
    intercomProps: { unreadCount: number }
  }
>) {
  const theme = useTheme()

  return (
    <HelpMenuSC
      fillLevel={2}
      {...props}
    >
      <h6 className="heading">Have a question?</h6>
      <HelpMenuButton
        startIcon={
          <LifePreserverIcon
            size={16}
            color={theme.colors['icon-info']}
          />
        }
        onClick={() => {
          setHelpMenuState(HelpMenuState.intercom)
        }}
        count={intercomProps.unreadCount}
      >
        Contact support
      </HelpMenuButton>
      <HelpMenuButton
        startIcon={
          <ChatIcon
            size={16}
            color={theme.colors['icon-primary']}
          />
        }
        onClick={() => {
          setHelpMenuState(HelpMenuState.chatBot)
        }}
      >
        Ask Plural AI
      </HelpMenuButton>
      <HelpMenuButton
        startIcon={
          <DocumentIcon
            size={16}
            color={theme.colors['icon-success']}
          />
        }
        onClick={() => {
          setHelpMenuState(HelpMenuState.docSearch)
          setHelpOpenState(HelpOpenState.closed)
        }}
      >
        Search docs
      </HelpMenuButton>
    </HelpMenuSC>
  )
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
const INTERCOM_UPDATE_UNREAD_COUNT_EVENT_TYPE = 'pluralIntercomUpdateCount'

type HelpLaunchEventProps = { menu: HelpMenuState }
type HelpLaunchEvent = CustomEvent<HelpLaunchEventProps>
const HelpLaunchEvent = CustomEvent<HelpLaunchEventProps>

export function launchHelp(section: HelpMenuState) {
  const event = new HelpLaunchEvent(HELP_LAUNCH_EVENT_TYPE, {
    detail: { menu: section },
  })

  window.dispatchEvent(event)
}

export function updateIntercomUnread(unreadCount: number) {
  console.log('updateIntercomUnread', unreadCount)
  const event = new IntercomUpdateUnreadEvent(
    INTERCOM_UPDATE_UNREAD_COUNT_EVENT_TYPE,
    {
      detail: { count: unreadCount },
    }
  )

  window.dispatchEvent(event)
}

type IntercomUpdateUnreadProps = {
  count?: number
}
type IntercomUpdateUnreadEvent = CustomEvent<IntercomUpdateUnreadProps>
const IntercomUpdateUnreadEvent = CustomEvent<IntercomUpdateUnreadProps>

function useCustomEventListener<E extends CustomEvent>(
  eventType: string,
  listener: (e: E) => void
) {
  useEffect(() => {
    window.addEventListener(eventType, listener as EventListener)

    return () => {
      window.removeEventListener(eventType, listener as EventListener)
    }
  }, [eventType, listener])
}

function useIntercomUpdateUnread(cb: (unread: number) => void) {
  useCustomEventListener<IntercomUpdateUnreadEvent>(
    INTERCOM_UPDATE_UNREAD_COUNT_EVENT_TYPE,
    useCallback(
      (e) => {
        const { count } = e.detail || {}

        if (typeof count === 'number' && count >= 0) {
          cb(count)
        }
      },
      [cb]
    )
  )
}

function useLaunchEventListener(cb: (menu: HelpMenuState) => void) {
  useCustomEventListener<HelpLaunchEvent>(
    HELP_LAUNCH_EVENT_TYPE,
    useCallback(
      (e) => {
        console.log('listened', e)
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
  const prevMenuState = usePrevious(menuState)
  const prevOpenState = usePrevious(openState)

  const closeHelp = useCallback(() => {
    console.log('closeHelp()')
    setMenuState(HelpMenuState.menu)
    setOpenState(HelpOpenState.closed)
  }, [])

  const minHelp = useCallback(() => {
    setOpenState(HelpOpenState.min)
  }, [])

  // Handle intercom

  const { isOpen: intercomIsOpen, ...intercom } = useIntercom()
  const intercomWasOpen = usePrevious(intercomIsOpen)

  console.log('was/is open', intercomWasOpen, intercomIsOpen)

  useEffect(() => {
    console.log('menu state changed', menuState)
    console.log('open state changed', openState)
    if (prevMenuState === menuState && prevOpenState === openState) {
      console.log('no changes')

      return
    }

    if (
      menuState === HelpMenuState.intercom &&
      openState === HelpOpenState.open
    ) {
      intercom.show()
    } else {
      intercom.hide()
    }
  }, [
    intercom,
    intercomIsOpen,
    menuState,
    openState,
    prevMenuState,
    prevOpenState,
  ])

  useEffect(() => {
    if (intercomIsOpen && !intercomWasOpen) {
      console.log('intercom has opened event')
      if (menuState !== HelpMenuState.intercom) {
        console.log('setMenuState(HelpMenuState.intercom)')
        setMenuState(HelpMenuState.intercom)
      }
      if (openState !== HelpOpenState.open) {
        console.log('setOpenState(HelpOpenState.open)')
        setOpenState(HelpOpenState.open)
      }
    }
    if (!intercomIsOpen && intercomWasOpen) {
      console.log('intercom has closed event')
      if (menuState === HelpMenuState.intercom) {
        console.log('setMenuState(HelpMenuState.menu')
        setMenuState(HelpMenuState.menu)
      }
      if (openState === HelpOpenState.open) {
        console.log('setOpenState(HelpOpenState.closed)')
        setOpenState(HelpOpenState.closed)
      }
    }
  }, [intercomIsOpen, intercomWasOpen, menuState, openState])

  useIntercomUpdateUnread(setIntercomUnreadCount)

  // End handle intercom

  useLaunchEventListener((menu) => {
    console.log('launchEventListener()')
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

  console.log('klinky')

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
