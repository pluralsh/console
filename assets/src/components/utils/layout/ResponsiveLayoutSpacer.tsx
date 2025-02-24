import styled from 'styled-components'

export const ResponsiveLayoutSpacer = styled.div(({ theme }) => ({
  flexGrow: 1,
  [`@media (max-width: ${theme.breakpoints.desktopLarge - 1}px)`]: {
    display: 'none',
  },
}))
