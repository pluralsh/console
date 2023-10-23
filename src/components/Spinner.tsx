import { type ComponentProps } from 'react'
import styled, { keyframes } from 'styled-components'

const rotateAnim = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const SpinnerSC = styled(
  styled('div')<{ $color: string; $size: number }>(
    ({ theme, $color, $size }) => ({
      display: 'block',
      width: $size,
      height: $size,
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: $size,
        height: $size,
        marginTop: $size * -0.5,
        marginLeft: $size * -0.5,
        borderRadius: '50%',
        borderTop: `2px solid ${$color || theme.colors['icon-default']}`,
        borderRight: `2px solid transparent`,
      },
    })
  )
)`
  &::before {
    animation: ${rotateAnim} 0.8s linear infinite;
  }
`

export function Spinner({
  color,
  size = 16,
  as,
  ...props
}: { color?: string; size?: number } & ComponentProps<typeof SpinnerSC>) {
  return (
    <SpinnerSC
      $color={color}
      $size={size}
      {...(as ? { forwardedAs: as } : {})}
      {...props}
    />
  )
}
