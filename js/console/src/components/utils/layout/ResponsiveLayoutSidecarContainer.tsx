import styled from 'styled-components'

export const ResponsiveLayoutSidecarContainer = styled.div<{
  $breakpointWidth?: number
}>(({ theme, $breakpointWidth }) => ({
  overflowY: 'auto',
  paddingRight: theme.spacing.xxsmall,
  marginLeft: theme.spacing.xlarge,
  width: '220px',
  flexShrink: 0,
  [`@container (max-width: ${$breakpointWidth ?? theme.breakpoints.desktop - 1}px)`]:
    { display: 'none' },
}))
