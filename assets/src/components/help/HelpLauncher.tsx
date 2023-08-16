// import { Button, usePrevious } from '@pluralsh/design-system'
import { Merge } from 'type-fest'
import styled, { DefaultTheme, useTheme } from 'styled-components'
import { useVisuallyHidden } from 'react-aria'

import {
  ComponentProps,
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
} from 'react'

import {
  Button,
  Card,
  CaretDownIcon,
  CaretUpIcon,
  DocumentIcon,
  LifePreserverIcon,
} from '@pluralsh/design-system'

import HelpIcon from './HelpIcon'

import Chatbot from './Chatbot'
import { IntercomChat } from './IntercomChat'
import ChatIcon from './ChatIcon'

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

const HelpLauncherBtnSC = styled.button(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    ...theme.partials.reset.button,
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
  ...props
}: Merge<
  ComponentProps<typeof HelpLauncherBtnSC>,
  { variant: 'help' | 'minimize' }
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

enum HelpMenuState {
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
  ...props
}: Merge<
  ComponentProps<typeof HelpMenuSC>,
  {
    setHelpMenuState: Dispatch<SetStateAction<HelpMenuState>>
    setHelpOpenState: Dispatch<SetStateAction<HelpOpenState>>
  }
>) {
  const theme = useTheme()

  return (
    <HelpMenuSC
      fillLevel={2}
      {...props}
    >
      <h6 className="heading">Have a question?</h6>
      <Button
        secondary
        startIcon={
          <LifePreserverIcon
            size={16}
            color={theme.colors['icon-info']}
          />
        }
        onClick={() => {
          setHelpMenuState(HelpMenuState.intercom)
        }}
      >
        Contact support
      </Button>
      <Button
        secondary
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
      </Button>
      <Button
        secondary
        startIcon={
          <DocumentIcon
            size={16}
            color={theme.colors['icon-success']}
          />
        }
        onClick={() => {
          setHelpMenuState(HelpMenuState.menu)
          setHelpOpenState(HelpOpenState.closed)
        }}
      >
        Search docs
      </Button>
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
const HelpLauncherContentSC = styled.div<{ $isOpen: boolean }>(
  ({ $isOpen, theme }) => {
    const helpSpacing = getHelpSpacing(theme)

    return {
      display: $isOpen ? 'flex' : 'none',
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
  }
)

function HelpLauncher() {
  const [menuState, setMenuState] = useState<HelpMenuState>(HelpMenuState.menu)
  const [openState, setOpenState] = useState<HelpOpenState>(
    HelpOpenState.closed
  )
  // const prevOpenState = usePrevious(openState)

  const closeHelp = useCallback(() => {
    setMenuState(HelpMenuState.menu)
    setOpenState(HelpOpenState.closed)
  }, [])

  const minHelp = useCallback(() => {
    setOpenState(HelpOpenState.min)
  }, [])
  const contentOpts = {
    [HelpMenuState.chatBot]: (
      <Chatbot
        onClose={closeHelp}
        onMin={minHelp}
      />
    ),
    [HelpMenuState.docSearch]: (
      <HelpMenu
        setHelpMenuState={setMenuState}
        setHelpOpenState={setOpenState}
      />
    ),
    [HelpMenuState.intercom]: <IntercomChat onClose={closeHelp} />,
    [HelpMenuState.menu]: (
      <HelpMenu
        setHelpMenuState={setMenuState}
        setHelpOpenState={setOpenState}
      />
    ),
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
        />
      </HelpLauncherButtonsSC>
      <HelpLauncherContentSC $isOpen={openState === HelpOpenState.open}>
        {contentOpts[menuState]}
      </HelpLauncherContentSC>
    </HelpLauncherSC>
  )
}

export default HelpLauncher
