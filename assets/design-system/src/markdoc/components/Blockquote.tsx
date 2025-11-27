import { type ComponentProps } from 'react'

import styled from 'styled-components'

import { FillLevelProvider } from '../../components/contexts/FillLevelContext'

const StyledBlockquote = styled.blockquote(({ theme }) => ({
  position: 'relative',
  padding: `${theme.spacing.medium}px ${theme.spacing.xlarge}px`,
  background: theme.colors['fill-one'],
  margin: 0,
  marginTop: theme.spacing.xlarge,
  marginBottom: theme.spacing.xlarge,
  '&::before': {
    pointerEvents: 'none',
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderLeft: `2px solid ${theme.colors['text-light']}`,
  },
}))

export function Blockquote({
  children,
  ...props
}: ComponentProps<typeof StyledBlockquote>) {
  return (
    <FillLevelProvider value={1}>
      <StyledBlockquote {...props}>{children}</StyledBlockquote>
    </FillLevelProvider>
  )
}
