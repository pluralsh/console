import styled from 'styled-components'

export const PolicyPanelHeader = styled.header(({ theme }) => ({
  ...theme.partials.text.overline,
  backgroundColor: theme.colors['fill-one'],
  boxSizing: 'border-box',
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  lineHeight: 1,
  minHeight: 40,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders['fill-one'],
  width: '100%',
}))
