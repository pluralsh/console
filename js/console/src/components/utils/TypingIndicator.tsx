import { ReactElement } from 'react'
import styled, { keyframes } from 'styled-components'

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(1); opacity: 0.7; }
  40% { transform: scale(1.3); opacity: 1; }
`

const Dots = styled.div`
  display: flex;
  align-items: center;
  height: 24px;
  gap: 4px;
`

const Dot = styled.span<{ delay: number }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors['text-xlight']};
  display: inline-block;
  animation: ${bounce} 1.4s infinite both;
  animation-delay: ${({ delay }) => delay}s;
`

export default function TypingIndicator({ ...props }): ReactElement {
  return (
    <Dots {...props}>
      <Dot delay={0} />
      <Dot delay={0.2} />
      <Dot delay={0.4} />
    </Dots>
  )
}
