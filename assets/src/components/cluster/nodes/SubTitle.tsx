import styled from 'styled-components'

export const SubTitle = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle1,
  margin: 0,
  marginBottom: theme.spacing.medium,
}))
