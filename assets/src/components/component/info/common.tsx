import { Card, PropWide } from '@pluralsh/design-system'
import styled from 'styled-components'

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
  fontVariantNumeric: 'lining-nums',
})
