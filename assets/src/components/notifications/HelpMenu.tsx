import { Merge } from 'type-fest'
import styled, { useTheme } from 'styled-components'
import { ComponentProps } from 'react'
import {
  Button,
  Card,
  DocumentIcon,
  LifePreserverIcon,
} from '@pluralsh/design-system'

import { CountBadge } from './CountBadge'

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
  '&&': {
    padding: theme.spacing.medium,
    display: 'flex',
    flexDirection: 'column',
    rowGap: theme.spacing.medium,
    boxShadow: theme.boxShadows.modal,
  },
  '.heading': {
    margin: 0,
    ...theme.partials.text.overline,
  },
}))

export function HelpMenu({
  intercomProps,
  ...props
}: Merge<
  ComponentProps<typeof HelpMenuSC>,
  {
    intercomProps: { unreadCount: number }
  }
>) {
  const theme = useTheme()

  return (
    <HelpMenuSC
      fillLevel={2}
      {...props}
    >
      <HelpMenuButton
        startIcon={
          <DocumentIcon
            size={16}
            color={theme.colors['icon-success']}
          />
        }
      >
        Search docs
      </HelpMenuButton>
      <HelpMenuButton
        startIcon={
          <LifePreserverIcon
            size={16}
            color={theme.colors['icon-info']}
          />
        }
        count={intercomProps.unreadCount}
      >
        Contact support
      </HelpMenuButton>
    </HelpMenuSC>
  )
}
