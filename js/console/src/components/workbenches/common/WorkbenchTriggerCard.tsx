import { Accordion } from '@pluralsh/design-system'
import styled from 'styled-components'

export const TriggerCardSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small} ${theme.spacing.large}`,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-zero'],
}))

export const TriggerCardIconWrapperSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
})

export const TriggerAccordionSC = styled(Accordion)({
  background: 'none',
  border: 'none',
  boxShadow: 'none',
  marginTop: 0,
})

export const TriggerPropsRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
}))
