import { type ComponentProps, type MutableRefObject, forwardRef } from 'react'

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

function BlockquoteRef(
  { children, ...props }: ComponentProps<typeof StyledBlockquote>,
  ref: MutableRefObject<any>
) {
  return (
    <FillLevelProvider value={1}>
      <StyledBlockquote
        ref={ref}
        {...props}
      >
        {children}
      </StyledBlockquote>
    </FillLevelProvider>
  )
}

export const Blockquote = forwardRef(BlockquoteRef)
