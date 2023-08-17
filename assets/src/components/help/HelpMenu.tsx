import { Merge } from 'type-fest'
import styled, { useTheme } from 'styled-components'
import { ComponentProps, Dispatch, SetStateAction } from 'react'
import {
  Button,
  Card,
  DocumentIcon,
  LifePreserverIcon,
} from '@pluralsh/design-system'

import ChatIcon from './ChatIcon'
import { CountBadge } from './CountBadge'
import { HelpMenuState, HelpOpenState } from './HelpLauncher'

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

export function HelpMenu({
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
