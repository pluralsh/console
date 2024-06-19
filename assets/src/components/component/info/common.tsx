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
  ...props
}: {
  title: string
  children: ReactNode
}) {
  const theme = useTheme()

  return (
    <section
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        '& > :first-child': {
          marginBottom: -theme.spacing.xxsmall,
        },
      }}
      {...props}
    >
      {title && <InfoSectionH2>{title}</InfoSectionH2>}
      {children}
    </section>
  )
}
