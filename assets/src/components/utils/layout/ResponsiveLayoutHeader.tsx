import styled from 'styled-components'

export const ResponsiveLayoutHeader = styled.div(({ theme }) => ({
  display: 'flex',
  width: '100%',
  overflowX: 'hidden',
  paddingBottom: theme.spacing.large,
  flexGrow: 1,
}))
