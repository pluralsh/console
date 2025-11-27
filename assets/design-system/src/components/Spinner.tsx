import { type ComponentPropsWithRef } from 'react'
import styled, { keyframes, useTheme } from 'styled-components'

const rotateAnim = keyframes`
  from {
    transform: rotate(270deg);
  }
  to {
    transform: rotate(630deg);
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
  ...props
}: { color?: string; size?: number } & ComponentPropsWithRef<'div'>) {
  return (
    <SpinnerSC
      $color={color}
      $size={size}
      {...props}
    />
  )
}

// new spinner, ultimately might want to migrate all to this one
export function SpinnerAlt({
  color,
  size = 16,
  ...props
}: { color?: string; size?: number } & ComponentPropsWithRef<'svg'>) {
  const { mode, colors } = useTheme()
  const gapColor = mode === 'dark' ? colors.grey[750] : colors.grey[200]
  const strokeWidth = size * 0.138
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={gapColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* spinner */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color ?? colors['icon-info']}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference * 0.33} ${circumference * 0.8}`}
        strokeLinecap="round"
        css={`
          transform-origin: center;
          animation: ${rotateAnim} 1s cubic-bezier(0.4, 0.15, 0.6, 0.85)
            infinite;
        `}
      />
    </svg>
  )
}
