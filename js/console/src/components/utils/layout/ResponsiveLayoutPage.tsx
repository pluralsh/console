import styled from 'styled-components'

export const ResponsiveLayoutPage = styled.div(({ theme }) => ({
  display: 'flex',
  height: '100%',
  width: '100%',
  overflowY: 'hidden',
  paddingTop: theme.spacing.large,
  paddingLeft: theme.spacing.large,
  paddingRight: theme.spacing.large,
  paddingBottom: 0,
  flexGrow: 1,
}))
