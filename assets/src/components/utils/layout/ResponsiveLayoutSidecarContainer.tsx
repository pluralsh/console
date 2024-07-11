import styled from 'styled-components'

export const ResponsiveLayoutSidecarContainer = styled.div(({ theme }) => ({
  marginLeft: theme.spacing.xlarge,
  width: '200px',
  flexShrink: 0,
  [`@media (max-width: ${theme.breakpoints.desktop - 1}px)`]: {
    display: 'none',
  },
}))
