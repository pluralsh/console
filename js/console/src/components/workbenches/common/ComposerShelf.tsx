import styled from 'styled-components'

// A panel docked on top of a composer, drawn as just a border on the thread's own background. It runs on under the
// composer's rounded top corners, so the composer has to be positioned to paint over it.
export const ComposerShelfSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  backgroundColor: 'transparent',
  border: theme.borders.input,
  borderBottom: 'none',
  borderRadius: `${theme.borderRadiuses.large}px ${theme.borderRadiuses.large}px 0 0`,
  marginBottom: -theme.borderRadiuses.large,
  padding: `${theme.spacing.xsmall} 0 calc(${theme.spacing.small} + ${theme.borderRadiuses.large}px)`,
}))
