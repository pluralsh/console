import { type ComponentPropsWithRef } from 'react'
import styled, { keyframes, useTheme } from 'styled-components'

import { SemanticColorKey } from '../theme/colors'

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const twinkle = keyframes`
  0%,
  80%,
  100% {
    opacity: 0.22;
  }
  40% {
    opacity: 1;
  }
`

const AgentLoadingIconSC = styled.svg`
  flex-shrink: 0;
  display: block;
  animation: ${spin} 3.2s linear infinite;

  .dot {
    animation: ${twinkle} 1.05s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.18s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.36s;
  }
`

export function AgentLoadingIcon({
  size = 12,
  color,
  ...props
}: {
  size?: number
  color?: SemanticColorKey
} & ComponentPropsWithRef<'svg'>) {
  const { colors } = useTheme()
  const fill = (color ? colors[color] : undefined) ?? colors['icon-xlight']

  return (
    <AgentLoadingIconSC
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <circle
        className="dot"
        cx="6"
        cy="2.25"
        r="1.55"
        fill={fill}
      />
      <circle
        className="dot"
        cx="2.55"
        cy="9.15"
        r="1.55"
        fill={fill}
      />
      <circle
        className="dot"
        cx="9.45"
        cy="9.15"
        r="1.55"
        fill={fill}
      />
    </AgentLoadingIconSC>
  )
}
