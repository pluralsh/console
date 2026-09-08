import { Button } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import { ReactNode } from 'react'
import styled from 'styled-components'

export function PoliciesTabLayout({
  description,
  actionLabel,
  onAction,
  children,
}: {
  description: string
  actionLabel: string
  onAction: () => void
  children: ReactNode
}) {
  return (
    <WrapperSC>
      <HeaderSC>
        <Body2P
          $color="text-xlight"
          css={{ flex: 1, minWidth: 0 }}
        >
          {description}
        </Body2P>
        <Button
          primary
          small
          css={{ flexShrink: 0 }}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </HeaderSC>
      {children}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.large,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
}))
