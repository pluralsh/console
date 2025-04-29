import { useTheme } from 'styled-components'

export enum MarkerType {
  Arrow = 'plural-marker-arrow',
  ArrowActive = 'plural-marker-arrow-active',
  ArrowHovered = 'plural-marker-arrow-hovered',
  ArrowPrimary = 'plural-marker-arrow-primary',
}

function Marker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      markerWidth="24"
      markerHeight="24"
      viewBox="-10 -10 20 20"
      refX="0"
      refY="0"
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
    >
      <polyline
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        points="-5,-3 0,0 -5,3"
        style={{ stroke: color, strokeWidth: '1' }}
      />
    </marker>
  )
}

export function MarkerDefs() {
  const theme = useTheme()

  return (
    <svg>
      <defs>
        <Marker
          id={MarkerType.Arrow}
          color={theme.colors.border}
        />
        <Marker
          id={MarkerType.ArrowActive}
          color={theme.colors['border-secondary']}
        />
        <Marker
          id={MarkerType.ArrowHovered}
          color={theme.colors['text-light']}
        />
        <Marker
          id={MarkerType.ArrowPrimary}
          color={theme.colors['border-primary']}
        />
      </defs>
    </svg>
  )
}
