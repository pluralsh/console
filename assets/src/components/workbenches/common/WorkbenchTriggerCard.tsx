import { Accordion } from '@pluralsh/design-system'
import styled from 'styled-components'

export const TriggerCardSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small}px ${theme.spacing.large}px`,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-zero'],
}))

export const TriggerCardIconWrapperSC = styled.div(({ theme }) => ({
  width: 36,
  height: 36,
  minWidth: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: theme.borders.input,
}))

export const TriggerAccordionSC = styled(Accordion)({
  background: 'none',
  border: 'none',
  marginTop: 0,
})

export const TriggerPropsRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
}))
