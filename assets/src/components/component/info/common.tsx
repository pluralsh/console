import { Card, PropWide } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'

export const InfoSectionH2 = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle1,
}))

export const InfoSectionH3 = styled.h3(({ theme }) => ({
  ...theme.partials.text.subtitle2,
}))

export const InfoSectionH4 = styled.h4(({ theme }) => ({
  ...theme.partials.text.body1Bold,
}))

export const PaddedCard = styled(Card)(({ theme }) => ({
  '&&': { padding: theme.spacing.large },
}))

export const PropWideBold = styled(PropWide)({
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
})

export const PropGroup = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  justifyContent: 'space-between',
  padding: `${theme.spacing.medium}px 0`,
}))

export function InfoSection({
  title,
  children,
  headerSize = 2,
  ...props
}: {
  title: string
  children: ReactNode
  headerSize?: 2 | 3 | 4
}) {
  const theme = useTheme()
  const Header = {
    2: InfoSectionH2,
    3: InfoSectionH3,
    4: InfoSectionH4,
  }[headerSize]

  return (
    <section
      css={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: theme.spacing.small,
        '& > :first-child': {
          marginBottom: -theme.spacing.xxxsmall,
        },
      }}
      {...props}
    >
      {title && <Header>{title}</Header>}
      {children}
    </section>
  )
}
