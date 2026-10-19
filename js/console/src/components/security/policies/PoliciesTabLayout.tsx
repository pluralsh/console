import { Button } from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
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
      <PageToolbarPortal>
        <Button
          primary
          small
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </PageToolbarPortal>
      <Body2P $color="text-xlight">{description}</Body2P>
      {children}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.medium,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
}))
