import { Button, Card, DocumentIcon } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import styled, { useTheme } from 'styled-components'
import { Merge } from 'type-fest'

import { CountBadge } from '../utils/CountBadge'

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
  changeState,
  ...props
}: ComponentProps<typeof HelpMenuSC> & {
  changeState: (menuState?: HelpMenuState, openState?: HelpOpenState) => void
}) {
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
        onClick={() =>
          changeState(HelpMenuState.docSearch, HelpOpenState.closed)
        }
      >
        Search docs
      </HelpMenuButton>
    </HelpMenuSC>
  )
}
