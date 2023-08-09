// import { Button, usePrevious } from '@pluralsh/design-system'
import { Merge } from 'type-fest'
import styled, { DefaultTheme, useTheme } from 'styled-components'
import { useVisuallyHidden } from 'react-aria'

import {
  ComponentProps,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useState,
} from 'react'

import { Button, Card, DocumentIcon } from '@pluralsh/design-system'

import HelpIcon from './HelpIcon'

import Chatbot from './Chatbot'
import { IntercomChat } from './IntercomChat'

const getHelpSpacing = (theme: DefaultTheme) => ({
  gap: {
    vertical: theme.spacing.xsmall,
    horizontal: theme.spacing.xsmall,
  },
  // Intercom has a hard-minimum horizontal padding of 20px
  // So padding.right must be 20px or larger
  padding: {
    right: theme.spacing.large,
    left: theme.spacing.large,
    top: theme.spacing.large,
    bottom: 0,
  },
  icon: {
    width: theme.spacing.xxlarge,
    height: theme.spacing.xxlarge,
  },
})

export function useHelpSpacing() {
  const theme = useTheme()

  return getHelpSpacing(theme)
}

export const HELP_RIGHT_PAD = 32

export const HELP_BOTTOM_PAD = 32

const BTN_OVERSHOOT = 20

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
    transition: 'transform 0.2s ease',

    '&:hover': {
      background: theme.colors['action-primary-hover'],
      transform: `translateY(${BTN_OVERSHOOT - theme.spacing.xsmall / 2}px)`,
    },
    '&:focus-visible': {
      background: theme.colors['action-primary-hover'],
      border: theme.borders['outline-focused'],
    },
  }
})

function HelpLauncherBtn(props: ComponentProps<typeof HelpLauncherBtnSC>) {
  const { visuallyHiddenProps } = useVisuallyHidden()
  const theme = useTheme()

  return (
    <HelpLauncherBtnSC {...props}>
      <HelpIcon
        size={24}
        color={theme.colors['icon-light']}
      />
      <span {...visuallyHiddenProps}>Help</span>
    </HelpLauncherBtnSC>
  )
}

enum HelpState {
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

const HelpMenuSC = styled(Card)(({ theme }) => {
  // const helpSpacing = getHelpSpacing(theme)
  console.log('')

  return {
    // background: theme.colors['fill-one'],
    display: 'flex',
    padding: theme.spacing.medium,
    flexDirection: 'column',
    rowGap: theme.spacing.medium,
    '.heading': {
      margin: 0,
      ...theme.partials.text.overline,
    },
  }
})

function HelpMenu({
  setHelpState,
  ...props
}: Merge<
  ComponentProps<typeof HelpMenuSC>,
  { setHelpState: Dispatch<SetStateAction<HelpState>> }
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
          <DocumentIcon
            size={16}
            color={theme.colors['icon-info']}
          />
        }
        onClick={() => {
          setHelpState(HelpState.intercom)
        }}
      >
        Contact support
      </Button>
      <Button
        secondary
        startIcon={
          <DocumentIcon
            size={16}
            color={theme.colors['icon-primary']}
          />
        }
        onClick={() => {
          setHelpState(HelpState.chatBot)
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
          setHelpState(HelpState.docSearch)
        }}
      >
        Search docs
      </Button>
      <Button>Search docs</Button>
    </HelpMenuSC>
  )
}

const HelpLauncherSC = styled.div(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    position: 'fixed',
    zIndex: theme.zIndexes.tooltip,
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
const HelpLauncherContentSC = styled.div(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    position: 'absolute',
    right: 0,
    left: 0,
    top: 0,
    bottom:
      // helpSpacing.padding.bottom +
      helpSpacing.icon.height + helpSpacing.gap.vertical,
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'end',
    pointerEvents: 'none',
    '& > *': {
      pointerEvents: 'auto',
    },
  }
})

function HelpLauncher() {
  const [helpState, setHelpState] = useState<HelpState>(HelpState.menu)
  const [openState, setOpenState] = useState<HelpOpenState>(
    HelpOpenState.closed
  )
  // const prevOpenState = usePrevious(openState)

  const closeIntercom = useCallback(() => {
    setHelpState(HelpState.menu)
    setOpenState(HelpOpenState.closed)
  }, [])
  const contentOpts = {
    [HelpState.chatBot]: <Chatbot />,
    [HelpState.docSearch]: <Chatbot />,
    [HelpState.intercom]: <IntercomChat onClose={closeIntercom} />,
    [HelpState.menu]: <HelpMenu setHelpState={setHelpState} />,
  }

  const onLauncherClick = useCallback(() => {
    if (openState === 'closed' || openState === 'min') {
      setOpenState(HelpOpenState.open)
    } else {
      setOpenState(HelpOpenState.min)
    }
  }, [openState])
  let content: ReactNode = null

  if (openState === 'open') {
    content = contentOpts[helpState]
  }

  return (
    <HelpLauncherSC>
      <HelpLauncherBtn onClick={onLauncherClick} />
      <HelpLauncherContentSC>{content}</HelpLauncherContentSC>
    </HelpLauncherSC>
  )
}

export default HelpLauncher
