import { forwardRef } from 'react'

import { FillLevelProvider } from '@pluralsh/design-system'

import styled from 'styled-components'

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

function Blockquote({ children, ...props }, ref) {
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

export default forwardRef(Blockquote)
