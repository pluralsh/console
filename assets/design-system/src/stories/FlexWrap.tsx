import styled from 'styled-components'

export const FlexWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.large,
}))
