import { IssueStatus } from 'generated/graphql'
import { useId } from 'react'
import { DefaultTheme, useTheme } from 'styled-components'

type IconColor = keyof DefaultTheme['colors'] & `icon-${string}`

export const ISSUE_STATUS_COLORS: Record<IssueStatus, IconColor> = {
  [IssueStatus.Open]: 'icon-light',
  [IssueStatus.InProgress]: 'icon-warning',
  [IssueStatus.Completed]: 'icon-success',
  [IssueStatus.Cancelled]: 'icon-xlight',
}

// how far along the ring is filled in, for statuses still being worked on
const ISSUE_STATUS_PROGRESS: Partial<Record<IssueStatus, number>> = {
  [IssueStatus.Open]: 0,
  [IssueStatus.InProgress]: 0.5,
}

const VIEWBOX = 14
const CENTER = VIEWBOX / 2
const RING_RADIUS = 6
const PIE_RADIUS = 3.5

// Linear-style status icon: a ring filling in like a pie as work progresses,
// then a solid disc with a check (completed) or cross (cancelled).
export function IssueStatusGlyph({
  status,
  size = 14,
}: {
  status: IssueStatus
  size?: number
}) {
  const theme = useTheme()
  const maskId = useId()
  const color = theme.colors[ISSUE_STATUS_COLORS[status]]
  const progress = ISSUE_STATUS_PROGRESS[status]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      css={{ flexShrink: 0, display: 'block' }}
    >
      {progress !== undefined ? (
        <>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            stroke={color}
            strokeWidth={1.5}
          />
          {progress > 0 && (
            <path
              d={piePath(progress)}
              fill={color}
            />
          )}
        </>
      ) : (
        <>
          <mask id={maskId}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER}
              fill="white"
            />
            <path
              d={
                status === IssueStatus.Completed
                  ? 'M4.25 7.25l1.85 1.85 3.65-3.85'
                  : 'M4.75 4.75l4.5 4.5M9.25 4.75l-4.5 4.5'
              }
              stroke="black"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </mask>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={CENTER}
            fill={color}
            mask={`url(#${maskId})`}
          />
        </>
      )}
    </svg>
  )
}

// a clockwise wedge from 12 o'clock covering `fraction` of the circle
function piePath(fraction: number) {
  if (fraction >= 1) {
    return `M${CENTER} ${CENTER - PIE_RADIUS}a${PIE_RADIUS} ${PIE_RADIUS} 0 1 1 0 ${PIE_RADIUS * 2}a${PIE_RADIUS} ${PIE_RADIUS} 0 1 1 0 -${PIE_RADIUS * 2}Z`
  }
  const angle = fraction * 2 * Math.PI
  const x = CENTER + PIE_RADIUS * Math.sin(angle)
  const y = CENTER - PIE_RADIUS * Math.cos(angle)

  return `M${CENTER} ${CENTER}V${CENTER - PIE_RADIUS}A${PIE_RADIUS} ${PIE_RADIUS} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x} ${y}Z`
}
