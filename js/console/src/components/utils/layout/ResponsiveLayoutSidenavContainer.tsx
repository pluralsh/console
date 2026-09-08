import styled from 'styled-components'

export const ResponsiveLayoutSidenavContainer = styled.div(({ theme }) => ({
  marginRight: theme.spacing.xlarge,
  minWidth: 0,
  minHeight: 0,
  flexShrink: 0,
  width: '240px',
}))
